-- CreateTable
CREATE TABLE "EndpointCheckHistory" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "endpointId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "httpStatus" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndpointCheckHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EndpointCheckHistory" ADD CONSTRAINT "EndpointCheckHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndpointCheckHistory" ADD CONSTRAINT "EndpointCheckHistory_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "ApplicationEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
