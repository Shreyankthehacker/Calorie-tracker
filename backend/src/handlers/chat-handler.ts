import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ChatRequest, LogMealInput } from '../schemas/chat.js';
import type { ChatService } from '../services/chat-service.js';

export class ChatHandler {
  constructor(private readonly chatService: ChatService) {}

  chat = async (body: ChatRequest, request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.chatService.chat(request.user.sub, body);
    return reply.status(200).send(result);
  };

  confirmMeal = async (body: LogMealInput, request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.chatService.confirmMeal(request.user.sub, body);
    return reply.status(201).send(result);
  };
}
