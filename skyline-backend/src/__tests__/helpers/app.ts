/**
 * Test application factory.
 * Builds a minimal Express app from real routes so integration tests
 * hit the same middleware/controller stack as production, but without
 * starting an HTTP server or running background jobs.
 *
 * Call this AFTER all jest.mock() declarations in the test file so that
 * mocked modules are already in place when the routes are imported.
 */
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "../../routes/auth.routes";
import publicRoutes from "../../routes/public.routes";
import systemRoutes from "../../routes/system.routes";

import { errorHandler } from "../../middleware/error.middleware";
import { notFoundHandler } from "../../middleware/not-found.middleware";
import { prisma } from "../../lib/prisma";

export function createTestApp(): Application {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Inline health check matching production behaviour
  app.get("/health", async (_req, res) => {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected" });
    } catch {
      res.status(503).json({ status: "degraded", database: "disconnected" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/system", systemRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
