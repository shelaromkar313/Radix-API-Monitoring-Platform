import nodemailer, { type Transporter } from 'nodemailer';

interface LatencyAlertEmailInput {
  toEmail: string;
  userName?: string;
  projectName: string;
  endpointPath: string;
  method: string;
  currentLatencyMs: number;
  baselineLatencyMs: number;
  latencyDeviationPct: number;
  status: number;
  incidentId?: string;
  reason?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;
  private static isEthereal = false;
  // Anti-spam throttling: 3 minutes cooldown per endpoint
  private static emailCooldownMap = new Map<string, number>();
  private static readonly COOLDOWN_MS = 3 * 60 * 1000;

  /**
   * Initializes or reuses the email transporter
   */
  private static async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      this.isEthereal = false;
      return this.transporter;
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
      this.isEthereal = false;
      return this.transporter;
    }

    // Fallback: Generate Ethereal test account for development
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      this.isEthereal = true;
      console.log(`[EmailService] SMTP credentials not set. Initialized Ethereal test inbox: ${testAccount.user}`);
      return this.transporter;
    } catch (e: any) {
      console.warn(`[EmailService] Failed to create test account, fallback to json transport: ${e.message}`);
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      return this.transporter;
    }
  }

  /**
   * Sends an automated email alert when latency spikes suddenly on an API endpoint
   */
  static async sendLatencyAlert(input: LatencyAlertEmailInput): Promise<boolean> {
    if (!input.toEmail) {
      console.warn('[EmailService] Cannot send alert: recipient email is missing.');
      return false;
    }

    // Anti-spam throttling check
    const throttleKey = `${input.projectName}:${input.method}:${input.endpointPath}`;
    const lastSent = this.emailCooldownMap.get(throttleKey);
    const now = Date.now();
    if (lastSent && (now - lastSent) < this.COOLDOWN_MS) {
      console.log(`[EmailService] Throttling email alert for ${throttleKey} (sent recently)`);
      return false;
    }

    try {
      const transporter = await this.getTransporter();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const incidentLink = input.incidentId 
        ? `${frontendUrl}/incidents/${input.incidentId}` 
        : `${frontendUrl}/dashboard`;

      const fromAddress = process.env.EMAIL_FROM || '"RADIX Observability" <alerts@radix-monitoring.com>';
      const subject = `🚨 [LATENCY ALERT] Sudden Latency Surge on ${input.method.toUpperCase()} ${input.endpointPath} (${input.currentLatencyMs}ms)`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 36px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                      ⚡ <span style="color: #6366f1;">RADIX</span> OBSERVABILITY
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">
                      Autonomous SRE & Incident Intelligence
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 900; padding: 6px 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                      CRITICAL SURGE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Alert Body -->
          <tr>
            <td style="padding: 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                Sudden Latency Spike Detected
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong>${input.userName || 'Engineer'}</strong>,<br/>
                RADIX automated telemetry detected a sudden response time degradation on project <strong>${input.projectName}</strong>. The endpoint exceeded established baseline thresholds.
              </p>

              <!-- Endpoint Target Box -->
              <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="background-color: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 6px; margin-right: 8px;">
                        ${input.method.toUpperCase()}
                      </span>
                      <span style="font-family: monospace; font-size: 14px; font-weight: bold; color: #f8fafc;">
                        ${input.endpointPath}
                      </span>
                    </td>
                    <td align="right">
                      <span style="font-size: 12px; font-weight: bold; color: ${input.status >= 500 ? '#ef4444' : input.status >= 400 ? '#f59e0b' : '#10b981'};">
                        HTTP ${input.status}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Metric Comparison Cards -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="48%" style="background-color: #261b2e; border: 1px solid #4a1d35; border-radius: 14px; padding: 18px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; color: #f43f5e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Observed Latency
                    </div>
                    <div style="font-size: 28px; font-weight: 900; color: #fda4af; font-family: monospace;">
                      ${input.currentLatencyMs}ms
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #fb7185; margin-top: 4px;">
                      +${Math.round(input.latencyDeviationPct)}% above baseline
                    </div>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <td width="48%" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 18px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Normal Baseline
                    </div>
                    <div style="font-size: 28px; font-weight: 900; color: #ffffff; font-family: monospace;">
                      ${input.baselineLatencyMs}ms
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px;">
                      Rolling historical mean
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Diagnostics Note -->
              ${input.reason ? `
              <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; border-radius: 4px 10px 10px 4px; padding: 14px 18px; margin-bottom: 28px;">
                <div style="font-size: 12px; font-weight: bold; color: #c7d2fe; margin-bottom: 4px;">Telemetry Diagnostic Signature</div>
                <div style="font-size: 13px; color: #e0e7ff; line-height: 1.5;">${input.reason}</div>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                <tr>
                  <td align="center">
                    <a href="${incidentLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                      Open Incident Command Center &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Triggered automatically by RADIX Autonomous Incident & SRE Engine.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Timestamp: ${new Date().toUTCString()} &middot; Environment: ${process.env.NODE_ENV || 'production'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: input.toEmail,
        subject,
        html: htmlContent
      });

      this.emailCooldownMap.set(throttleKey, now);
      console.log(`[EmailService] Latency alert successfully dispatched to ${input.toEmail} (MessageId: ${info.messageId})`);

      if (this.isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[EmailService] 📬 ETHEREAL PREVIEW URL: ${previewUrl}`);
      }

      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send latency alert email: ${err.message}`);
      return false;
    }
  }
}
