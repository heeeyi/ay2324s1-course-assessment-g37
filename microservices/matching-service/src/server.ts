#!/usr/bin/env node

import amqp from 'amqplib';
import { isMatchRequest } from './utility/isMatchRequest';
import { createMatcher } from './controllers/matcher';
import { MatchResponse } from './types';

const QUEUE_NAME = 'matching_service_queue';

const URL = process.env.RABBITMQ_URL ?? 'amqp://127.0.0.1:5672';

function delay(duration: number) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

async function startServer() {
  try {
    const connection = await amqp.connect(URL);
    const channel = await connection.createChannel();

    const matcher = createMatcher();

    const q = await channel.assertQueue(QUEUE_NAME, {
      durable: false,
    });
    channel.prefetch(1);
    console.log('Awaiting match requests...');

    channel.consume(
      q.queue,
      function reply(msg) {
        if (!msg) {
          console.log('No message found on consume, dropping packet');
          return;
        }
        const request = JSON.parse(msg.content.toString() ?? '');
        if (!isMatchRequest(request)) {
          console.log('Invalid match request, dropping packet');
          return;
        }

        const onMatch = (matchResponse: MatchResponse) => {
          console.log(`Replying to request ${JSON.stringify(request)} with match: ${JSON.stringify(matchResponse)}`)
          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(matchResponse)),
            {
              correlationId: msg.properties.correlationId
            }
          );
        }
        console.log(`Queuing request ${JSON.stringify(request)}`);
        matcher.queueRequest(request, onMatch);
      },
      {
        noAck: true
      }
    )
  } catch (e) {
    console.log("Error in server, restarting...", e);
    await delay(10 * 1000);
    startServer();    
  }
  
}

async function main() {
  startServer();
}

main();
