import type { FastifyPluginAsync } from 'fastify';
import { ReportHandler } from '../handlers/report-handler.js';
import { reportRangeQuerySchema, reportTodayQuerySchema } from '../schemas/reports.js';
import { ReportService } from '../services/report-service.js';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  const reportService = new ReportService();
  const handler = new ReportHandler(reportService);

  app.addHook('preHandler', app.authenticate);

  app.get('/reports/today', async (request, reply) => {
    reportTodayQuerySchema.parse(request.query);
    return handler.today(request, reply);
  });

  app.get('/reports/calories', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.calories(query, request, reply);
  });

  app.get('/reports/macros', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.macros(query, request, reply);
  });

  app.get('/reports/micros', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.micronutrients(query, request, reply);
  });

  app.get('/reports/micronutrients', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.micronutrients(query, request, reply);
  });

  app.get('/reports/goals', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.goalVsActual(query, request, reply);
  });

  app.get('/reports/goal-vs-actual', async (request, reply) => {
    const query = reportRangeQuerySchema.parse(request.query);
    return handler.goalVsActual(query, request, reply);
  });
};
