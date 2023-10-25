import amqp from 'amqplib';
import { MatchRequest, MatchResponse } from '../types';
import { v4 as generateUuid } from 'uuid';
import { isMatchResponse } from './isMatchResponse';

const QUEUE_NAME = 'matching_service_queue';

const URL = process.env.RABBITMQ_URL ?? 'amqp://127.0.0.1:5672';

export async function sendMatchRequest(request: MatchRequest) {
  const connection = await amqp.connect(URL);
  const channel = await connection.createChannel();
  const q = await channel.assertQueue('', { exclusive: true });

  const correlationId = generateUuid();

  const consumerPromise = new Promise<MatchResponse | null>((resolve) => {
    channel.consume(
      q.queue,
      function(msg) {
        if (!msg) {
          console.log('No message found on consume, dropping packet');
          resolve(null);
          return;
        }
        if (msg.properties.correlationId != correlationId) {
          console.log('Request id does not match, dropping packet');
          resolve(null);
          return;
        }
        connection.close();
        const foundMatch = JSON.parse(msg.content.toString());
        if (!isMatchResponse(foundMatch)) {
          resolve(null);
          return;
        }
        resolve(foundMatch);
      },
      {
        noAck: true
      }
    );
  });

  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(request)),
    {
      correlationId: correlationId,
      replyTo: q.queue
    }
  );

  return consumerPromise;
}
