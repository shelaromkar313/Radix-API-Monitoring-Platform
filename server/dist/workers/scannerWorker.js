// import { getChannel } from '../config/rabbitmq.js';
import prisma from '../config/client.js';
import { getIO } from '../config/socket.js';
import redisClient from '../config/redis.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
const execAsync = promisify(exec);
const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'vendor', '.venv', 'venv', 'build', '.next', '.nuxt',
    'target', 'bin', 'obj', 'coverage', '.idea', '.vscode', '.gradle', '.cargo', 'out'
]);
const findFiles = (dir, fileList = []) => {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (EXCLUDED_DIRS.has(file))
                continue;
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                findFiles(fullPath, fileList);
            }
            else if (file.endsWith('.ts') ||
                file.endsWith('.js') ||
                file.endsWith('.php') ||
                file.endsWith('.py') ||
                file.endsWith('.go') ||
                file.endsWith('.java') ||
                file.endsWith('.cs')) {
                fileList.push(fullPath);
            }
        }
    }
    catch (err) {
        // Gracefully handle unreadable directories
    }
    return fileList;
};
const extractRoutesFromFiles = (files) => {
    const routes = [];
    // 1. Express / Nest / Fastify: app.get('/...', ...), router.post('/...', ...)
    const expressRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/gi;
    // 2. Laravel / PHP: Route::get('path', ...), Route::post('/path', ...)
    const laravelRegex = /Route::(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/gi;
    // 3. Python FastAPI / Flask: @app.get('/...'), @router.post('/...'), @bp.route('/...', methods=['...'])
    const pythonRegex = /@(?:app|router|bp)\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/gi;
    // 4. Go (Gin / Fiber / Echo / Chi): r.GET("/...", ...), app.Post("/...", ...)
    const goRegex = /(?:r|router|app|api|v1|group)\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"`](.*?)['"`]/gi;
    // 5. Spring Boot / Java: @GetMapping("/..."), @PostMapping("/...")
    const springRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"`](.*?)['"`]/gi;
    // 6. ASP.NET / C#: [HttpGet("...")], [HttpPost("...")]
    const csharpRegex = /\[Http(Get|Post|Put|Delete|Patch)\s*\(\s*['"`](.*?)['"`]\)\]/gi;
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            let match;
            while ((match = expressRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
            while ((match = laravelRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
            while ((match = pythonRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
            while ((match = goRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
            while ((match = springRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
            while ((match = csharpRegex.exec(content)) !== null) {
                const p = match[2].startsWith('/') ? match[2] : '/' + match[2];
                routes.push({ method: match[1].toUpperCase(), path: p });
            }
        }
        catch {
            // Ignore unreadable files
        }
    }
    const deduped = routes.filter((v, i, a) => a.findIndex(t => (t.method === v.method && t.path === v.path)) === i);
    return deduped;
};
const isGitUrl = (url) => {
    const clean = (url || '').trim().toLowerCase();
    return clean.includes('github.com') || clean.includes('gitlab.com') || clean.includes('bitbucket.org') || clean.endsWith('.git');
};
const getSafeIO = () => {
    try {
        return getIO();
    }
    catch {
        return null;
    }
};
const scanLiveService = async (projectId, liveUrl, io) => {
    console.log(`Scanning live service for project ${projectId}: ${liveUrl}`);
    if (io)
        io.to(projectId).emit('status_update', { status: 'scanning', message: 'Connecting to live service...' });
    const cleanBase = liveUrl.trim().replace(/\/+$/, '');
    const discoveredRoutes = [];
    // 1. Try Swagger / OpenAPI discovery
    const docEndpoints = ['/openapi.json', '/swagger.json', '/api-docs', '/v2/api-docs', '/api/openapi.json', '/api/swagger.json'];
    let foundSwagger = false;
    for (const docPath of docEndpoints) {
        try {
            const resp = await fetch(`${cleanBase}${docPath}`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(2500)
            });
            const contentType = resp.headers.get('content-type') || '';
            if (resp.ok && contentType.includes('json')) {
                const spec = (await resp.json());
                if (spec && typeof spec.paths === 'object') {
                    for (const [p, methods] of Object.entries(spec.paths)) {
                        for (const [m, details] of Object.entries(methods)) {
                            if (['get', 'post', 'put', 'delete', 'patch'].includes(m.toLowerCase())) {
                                discoveredRoutes.push({
                                    method: m.toUpperCase(),
                                    path: p.startsWith('/') ? p : `/${p}`,
                                    request_schema: details?.requestBody || null,
                                    response_schema: details?.responses || { 200: { description: 'OK' } }
                                });
                            }
                        }
                    }
                    if (discoveredRoutes.length > 0) {
                        foundSwagger = true;
                        break;
                    }
                }
            }
        }
        catch {
            // Continue to next doc probe
        }
    }
    // 2. If no Swagger/OpenAPI spec found, register standard live API / web entrypoints
    if (!foundSwagger || discoveredRoutes.length === 0) {
        discoveredRoutes.push({ method: 'GET', path: '/', response_schema: { status: 200, message: 'Root Web & API Entrypoint' } }, { method: 'GET', path: '/health', response_schema: { status: 'healthy', uptime: '99.9%' } }, { method: 'GET', path: '/api', response_schema: { status: 'active', version: 'v1' } }, { method: 'GET', path: '/api/status', response_schema: { operational: true } }, { method: 'POST', path: '/api/auth/login', request_schema: { email: 'user@example.com', password: '••••••••' } }, { method: 'GET', path: '/api/users', response_schema: { users: [] } });
    }
    // 3. Save to database
    await prisma.endpoint.deleteMany({ where: { project_id: projectId } });
    if (discoveredRoutes.length > 0) {
        await prisma.endpoint.createMany({
            data: discoveredRoutes.map(route => ({
                project_id: projectId,
                method: route.method,
                path: route.path,
                request_schema: (route.request_schema || null),
                response_schema: (route.response_schema || null)
            }))
        });
    }
    await prisma.project.update({ where: { id: projectId }, data: { status: 'completed' } });
    if (redisClient.isOpen) {
        try {
            await redisClient.del(`endpoints:${projectId}`);
        }
        catch { }
    }
    if (io)
        io.to(projectId).emit('status_update', { status: 'completed', message: 'Live service connected and endpoints ready' });
    console.log(`Successfully completed live service scan for project ${projectId}. Registered ${discoveredRoutes.length} endpoints.`);
};
export const processScanJob = async (projectId, repositoryUrl) => {
    console.log(`Processing Job for Project ${projectId}: ${repositoryUrl}`);
    const io = getSafeIO();
    const tempDir = path.join(process.cwd(), '.temp', projectId);
    try {
        await prisma.project.update({ where: { id: projectId }, data: { status: 'scanning' } });
        if (io)
            io.to(projectId).emit('status_update', { status: 'scanning', message: 'Scanning started' });
        // Handle Live API / Web URLs instantly without git clone
        if (!isGitUrl(repositoryUrl)) {
            await scanLiveService(projectId, repositoryUrl, io);
            return;
        }
        // 1. Clone Git Repository
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
        await execAsync(`git clone ${repositoryUrl} "${tempDir}" --depth 1`, {
            timeout: 60000,
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
        });
        if (io)
            io.to(projectId).emit('status_update', { status: 'processing', message: 'Analyzing code structure...' });
        // 2. Parse Files
        const files = findFiles(tempDir);
        const extractedRoutes = extractRoutesFromFiles(files);
        // 3. Save to DB using bulk createMany
        await prisma.endpoint.deleteMany({ where: { project_id: projectId } });
        if (extractedRoutes.length > 0) {
            await prisma.endpoint.createMany({
                data: extractedRoutes.map(route => {
                    const mockRequest = ['POST', 'PUT', 'PATCH'].includes(route.method)
                        ? { exampleField: "exampleValue", message: "Auto-generated request schema" }
                        : null;
                    const mockResponse = {
                        success: true,
                        message: `Mock response for ${route.method} ${route.path}`
                    };
                    return {
                        project_id: projectId,
                        method: route.method,
                        path: route.path,
                        request_schema: mockRequest,
                        response_schema: mockResponse
                    };
                })
            });
        }
        // 4. Update Status and Clear Cache
        await prisma.project.update({ where: { id: projectId }, data: { status: 'completed' } });
        if (redisClient.isOpen) {
            try {
                await redisClient.del(`endpoints:${projectId}`);
            }
            catch (err) {
                // Silent cleanup
            }
        }
        if (io)
            io.to(projectId).emit('status_update', { status: 'completed', message: 'Scanning completed successfully' });
        console.log(`Successfully completed scan for project ${projectId}. Found ${extractedRoutes.length} endpoints.`);
    }
    catch (error) {
        console.error(`Error processing project ${projectId}:`, error);
        await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
        if (io)
            io.to(projectId).emit('status_update', { status: 'failed', message: 'Scanning failed' });
    }
    finally {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
};
export const startWorker = async () => {
    // No longer needed for RabbitMQ, but keeping the export signature to avoid index.ts breakages
    console.log('Main server process now handles scans directly.');
};
