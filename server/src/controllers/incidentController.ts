import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { IncidentService } from '../services/incident/incidentService.js';
import { IncidentAnalysisService } from '../services/incident/ai/incidentAnalysisService.js';

export class IncidentController {
  static async getIncidents(req: AuthRequest, res: Response) {
    try {
      const { projectId, endpointId, severity, status, category, startDate, endDate, page, limit } = req.query;
      const result = await IncidentService.getIncidents({
        projectId: projectId as string,
        endpointId: endpointId as string,
        severity: severity as string,
        status: status as string,
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20
      });
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch incidents' });
    }
  }

  static async getIncidentById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const incident = await IncidentService.getIncidentById(id);
      res.status(200).json(incident);
    } catch (error: any) {
      console.error('Error fetching incident details:', error);
      res.status(404).json({ message: error.message || 'Incident not found' });
    }
  }

  static async triggerAnalysis(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const analysis = await IncidentAnalysisService.analyzeIncident(id);
      res.status(200).json(analysis);
    } catch (error: any) {
      console.error('Error analyzing incident:', error);
      res.status(500).json({ message: error.message || 'AI analysis failed' });
    }
  }

  static async getStats(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.query;
      const stats = await IncidentService.getIncidentStats(projectId as string);
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('Error fetching incident stats:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch stats' });
    }
  }

  static async submitFeedback(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { isCorrect, correctRootCause, comments } = req.body;
      const userId = req.user?.id || 'anonymous';

      const feedback = await IncidentService.submitFeedback({
        incidentId: id,
        userId,
        isCorrect: Boolean(isCorrect),
        correctRootCause,
        comments
      });

      res.status(201).json(feedback);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: error.message || 'Failed to submit feedback' });
    }
  }

  static async simulateOutage(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.body;
      const userId = req.user?.id;
      const incident = await IncidentService.simulateOutageDemo(projectId, userId);
      res.status(201).json({
        message: 'Demo outage scenario simulated successfully',
        incident
      });
    } catch (error: any) {
      console.error('Error running outage simulation:', error);
      res.status(500).json({ message: error.message || 'Simulation failed' });
    }
  }

  static async testEmailAlert(req: AuthRequest, res: Response) {
    try {
      const recipientEmail = req.body?.toEmail || req.user?.email || process.env.GMAIL_USER;
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required.' });
      }

      const { EmailService } = await import('../services/incident/notification/emailService.js');
      const sent = await EmailService.sendLatencyAlert({
        toEmail: recipientEmail,
        userName: req.user?.name || 'Administrator',
        projectName: 'Telemetry Verification',
        endpointPath: '/api/v1/checkout',
        method: 'POST',
        currentLatencyMs: 1680,
        baselineLatencyMs: 140,
        latencyDeviationPct: 1100,
        status: 200,
        reason: 'Manual Test: Sudden Latency Surge Alert Verification'
      });

      if (sent) {
        return res.json({ success: true, message: `Test latency alert successfully sent to ${recipientEmail}` });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to send alert email. Check server logs.' });
      }
    } catch (err: any) {
      console.error('Test email error:', err);
      return res.status(500).json({ message: err.message || 'Error sending test email' });
    }
  }
}
