import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

// Allowed binary filenames — guards against path traversal
const ALLOWED_PATTERN = /^opswatch-agent-(?:linux|darwin|windows)-(?:amd64|arm64|arm)(?:\.exe)?$/;

@ApiTags('downloads')
@Controller('downloads')
export class DownloadsController {
  /**
   * GET /api/v1/downloads/:filename
   *
   * Serves pre-compiled agent binaries that were bundled into the API image
   * at build time. Used by the SSH/PEM install script so the agent can be
   * fetched directly from the OpsWatch server — no GitHub releases needed.
   *
   * No authentication required (the agent binary itself is inert without a
   * valid API key; this endpoint is intentionally public).
   */
  @Get(':filename')
  @ApiOperation({ summary: 'Download agent binary' })
  @ApiParam({ name: 'filename', example: 'opswatch-agent-linux-amd64' })
  downloadAgent(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    if (!ALLOWED_PATTERN.test(filename)) {
      throw new NotFoundException('Binary not found');
    }

    // In production (Docker): /app/downloads/<filename>
    // In development:         <project-root>/downloads/<filename> (may be absent — see below)
    const filePath = join(process.cwd(), 'downloads', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        `Binary "${filename}" is not available on this server. ` +
          'It is bundled during the Docker build — run "docker compose build api" to produce it.',
      );
    }

    const { size } = statSync(filePath);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': size,
      // Allow the install script (curl/wget) to download without CORS friction
      'Access-Control-Allow-Origin': '*',
    });

    return new StreamableFile(createReadStream(filePath));
  }
}
