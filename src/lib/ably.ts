import * as Ably from "ably";

if (!process.env.ABLY_API_KEY) {
  throw new Error("ABLY_API_KEY is not defined in environment variables");
}

// Global Ably REST client instance
export const ablyRest = new Ably.Rest(process.env.ABLY_API_KEY);

/**
 * Publishes an event to a specified Ably channel.
 */
export async function publishToChannel(channelName: string, eventName: string, data: any) {
  try {
    const channel = ablyRest.channels.get(channelName);
    await channel.publish(eventName, data);
  } catch (error) {
    console.error(`[Ably REST] Failed to publish event ${eventName} to channel ${channelName}:`, error);
  }
}
