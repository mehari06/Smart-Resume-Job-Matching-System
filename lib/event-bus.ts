// lib/event-bus.ts

/**
 * Observer Pattern Implementation: EventBus
 * Efficiently manages subscriptions and notifies observers (recruiters)
 * when relevant events occur (like a new job application).
 */

type Subscriber = (data: any) => void;

class JobEventBus {
    // DSA approach: Map of Sets for O(1) lookup of subscribers by Recruiter ID
    private observers: Map<string, Set<Subscriber>> = new Map();

    /**
     * Subscribe a callback to events for a specific user.
     * @param userId The ID of the recruiter/user to observe for.
     * @param callback The function to execute when an event occurs.
     * @returns A function to unsubscribe.
     */
    subscribe(userId: string, callback: Subscriber): () => void {
        if (!this.observers.has(userId)) {
            this.observers.set(userId, new Set());
        }
        
        this.observers.get(userId)!.add(callback);
        
        // Return an unsubscribe function
        return () => this.unsubscribe(userId, callback);
    }

    /**
     * Remove a subscription.
     * @param userId The ID of the recruiter/user.
     * @param callback The function to remove.
     */
    private unsubscribe(userId: string, callback: Subscriber) {
        const subscribers = this.observers.get(userId);
        if (subscribers) {
            subscribers.delete(callback);
            if (subscribers.size === 0) {
                this.observers.delete(userId);
            }
        }
    }

    /**
     * Notify all observers of a specific user about an event.
     * @param userId The ID of the recruiter/user to notify.
     * @param data The event data (e.g., application details).
     */
    notify(userId: string, data: any) {
        const subscribers = this.observers.get(userId);
        if (subscribers) {
            // DSA Note: Iterating over a Set is efficient for moderate numbers of observers.
            subscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error notifying subscriber for user ${userId}:`, error);
                }
            });
        }
    }
}

// Export as a singleton
export const jobEventBus = new JobEventBus();
