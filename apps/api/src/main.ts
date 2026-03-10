import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('OpsWatch API')
    .setDescription('DevOps Monitoring Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-KEY' }, 'agent-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 OpsWatch API running on port ${port}`);

  const server = app.getHttpServer();
  const httpProxy = require('http-proxy');
  const proxy = httpProxy.createProxyServer({
    ws: true,
  });

  const { ContainersService } = require('./containers/containers.service');
  const containersService = app.get(ContainersService);
  const { JwtService } = require('@nestjs/jwt');
  const jwtService = app.get(JwtService);

  server.on('upgrade', async (req: any, socket: any, head: any) => {
    try {
      // Improved regex to better handle query params and potential path variations
      const url = req.url || '';
      const urlMatches = url.match(/containers\/([^\/?]+)\/terminal/);
      
      if (urlMatches) {
        const dockerId = urlMatches[1];
        // Extract token from query string
        const query = url.split('?')[1] || '';
        const tokenMatch = query.match(/(?:^|&)token=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        console.log(`[WS Proxy] Upgrade request for container: ${dockerId}`);

        if (!token) {
          console.warn(`[WS Proxy] Unauthorized: No token found in URL ${url}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        try {
          jwtService.verify(token);
        } catch (jwtErr) {
          console.warn(`[WS Proxy] Unauthorized: Invalid token for container ${dockerId}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const container = await containersService.findByDockerId(dockerId);
        if (container && container.server && container.server.ip) {
          const target = `http://${container.server.ip}:4001`;
          console.log(`[WS Proxy] Proxying terminal for ${dockerId} to ${target}`);
          
          req.url = `/api/containers/${dockerId}/terminal`;
          proxy.ws(req, socket, head, { target });
          return;
        }
        
        console.warn(`[WS Proxy] Container or Server IP not found for ${dockerId}`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }
    } catch (err) {
      console.error('[WS Proxy] Critical error:', err);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });
}
bootstrap();
