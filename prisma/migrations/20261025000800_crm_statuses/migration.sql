-- Keep historic statuses readable. New CRM writes the requested pipeline.
ALTER TYPE "LeadStatus" ADD VALUE 'CONTACTED';
ALTER TYPE "LeadStatus" ADD VALUE 'NEGOTIATING';
ALTER TYPE "LeadStatus" ADD VALUE 'WON';
ALTER TYPE "LeadStatus" ADD VALUE 'LOST';
