export type EventHandler<TEvent extends Event> = ((event: TEvent) => unknown) | null

/** Calls the `on<event>` handler (if any) and then the registered listeners. */
export function emit<TEvent extends Event>(target: EventTarget, event: TEvent, handler: EventHandler<TEvent>): void {
    handler?.call(target, event)
    target.dispatchEvent(event)
}
