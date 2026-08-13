import emitter from "./eventhandler.service";
import { Logger } from '@nestjs/common';

const logger = new Logger('EventListener');


export function setupEventListener(eventService: any) {
  emitter.on('event-created', async (eventDetail: any) => {
    logger.log(`Event listener triggered for event: ${eventDetail.event_name}`);
    try {
      await eventService.processEvent(eventDetail.client_id, eventDetail);
    } catch (err) {
      logger.error('Error processing event:', err);
    }
  });
}

export default emitter;