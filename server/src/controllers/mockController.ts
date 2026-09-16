import { Request, Response, NextFunction } from 'express';
import prisma from '../config/client.js';

const matchRoutePath = (pattern: string, actualPath: string): { matches: boolean; params: Record<string, string> } => {
  // Normalize leading/trailing slashes
  const pNorm = '/' + pattern.replace(/^\/+|\/+$/g, '');
  const aNorm = '/' + actualPath.replace(/^\/+|\/+$/g, '');

  if (pNorm.toLowerCase() === aNorm.toLowerCase()) {
    return { matches: true, params: {} };
  }

  const paramNames: string[] = [];
  const regexStr = pNorm
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    })
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

  try {
    const regex = new RegExp(`^${regexStr}$`, 'i');
    const match = aNorm.match(regex);
    if (!match) return { matches: false, params: {} };

    const params: Record<string, string> = {};
    paramNames.forEach((name, idx) => {
      params[name] = match[idx + 1];
    });
    return { matches: true, params };
  } catch {
    return { matches: false, params: {} };
  }
};

export const handleMockRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { projectId } = req.params;
  const mockPath = req.params[0] ? `/${req.params[0]}` : '/';
  const method = req.method.toUpperCase();

  try {
    // 1. Try fast exact match first
    let endpoint = await prisma.endpoint.findFirst({
      where: {
        project_id: projectId,
        method: method,
        path: mockPath
      }
    });

    let matchedParams: Record<string, string> = {};

    // 2. If no exact match, search candidate endpoints with dynamic pattern parameters
    if (!endpoint) {
      const candidates = await prisma.endpoint.findMany({
        where: {
          project_id: projectId,
          method: method
        }
      });

      for (const candidate of candidates) {
        const { matches, params } = matchRoutePath(candidate.path, mockPath);
        if (matches) {
          endpoint = candidate;
          matchedParams = params;
          break;
        }
      }
    }

    if (!endpoint) {
      res.status(404).json({ 
        error: 'Mock endpoint not found',
        method,
        path: mockPath,
        project_id: projectId
      });
      return;
    }

    // Return the configured mock response schema, injecting matched params if applicable
    let responseData = endpoint.response_schema || { message: `Mock response for ${method} ${mockPath}` };
    if (typeof responseData === 'object' && Object.keys(matchedParams).length > 0) {
      responseData = { ...responseData, ...matchedParams };
    }

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};
