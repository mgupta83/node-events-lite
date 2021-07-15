import { EventEmitter } from "events";
const cryptoRandomString = require("crypto-random-string");
const createCryptoRandomString = () => {
  return cryptoRandomString({ length: 32, type: "url-safe" });
};

export interface IEventProperties {
    origPublisherId: string
    eventId: string
    parentPublisherId: string
    parentId: string
    eventEnqueuedAt: Date
}

export interface IEventTrace {
    eventName: string
    origPublisherId: string
    eventId: string
    parentPublisherId: string
    parentId: string
    selfPublisherId: string
    selfId: string
    eventEnqueuedAt: Date
}

export interface IEventPublishInput<TEventPayload> {
    publisherId: string
    eventName: string
    eventPayload: TEventPayload
    incomingEventProperties?: IEventProperties
}

export interface IEventSubscriberFunction<TEventPayload> {
    ( eventPayload: TEventPayload, eventProperties: IEventProperties, eventTrace: IEventTrace) : void
}

export interface IEventSubscriptionInput<TEventPayload> {
    eventName: string
    subscriberName: string
    subscriberFunction: IEventSubscriberFunction<TEventPayload>
}

export class NodeEventsLite extends EventEmitter {
    static instance: NodeEventsLite

    private constructor(){
        super()
    }

    private static getInstance(): NodeEventsLite {
        if(!NodeEventsLite.instance){
            NodeEventsLite.instance = new NodeEventsLite()
        }
        return NodeEventsLite.instance
    }

    public static startEventSubscription<TEventPayload>(input: IEventSubscriptionInput<TEventPayload>):void {
        let eventObj:NodeEventsLite = NodeEventsLite.getInstance()
        eventObj.on(input.eventName, (eventPayload, eventProperties, eventTrace) => input['subscriberFunction'](eventPayload, eventProperties, eventTrace))
        console.log(`*** [NodeEventsLite] Event: ${input.eventName}, Subscriber: ${input.subscriberName} - started`)
    }

    public static publishEvent<TEventPayload>(input: IEventPublishInput<TEventPayload>):boolean {
        let eventObj:NodeEventsLite = NodeEventsLite.getInstance()

        let selfId = createCryptoRandomString()
        let currTimestamp = new Date()
        let eventId = input.incomingEventProperties?.eventId ? input.incomingEventProperties.eventId : selfId
        let origPublisherId = input.incomingEventProperties?.origPublisherId ? input.incomingEventProperties?.origPublisherId : input.publisherId

        let newEventProperties:IEventProperties = {
            eventEnqueuedAt: currTimestamp,
            origPublisherId: origPublisherId,
            eventId: eventId,
            parentPublisherId: input.publisherId,
            parentId: selfId
        }

        let eventTrace:IEventTrace = {
            eventName: input.eventName,
            eventEnqueuedAt: currTimestamp,
            origPublisherId: origPublisherId,
            eventId: eventId,
            parentPublisherId: input.incomingEventProperties?.parentPublisherId,
            parentId: input.incomingEventProperties?.parentId,
            selfPublisherId: input.publisherId,
            selfId: selfId
        }

        console.log(`*** [NodeEventsLite] Event: ${input.eventName}, 
            Payload: ${JSON.stringify(input.eventPayload)}, 
            Properties: ${JSON.stringify(newEventProperties)}
            Trace: ${JSON.stringify(eventTrace)}
             - publishing`)

        eventObj.emit('all', input.eventPayload, newEventProperties, eventTrace)
        return eventObj.emit(input.eventName, input.eventPayload, newEventProperties, eventTrace) ||
            eventObj.emit('unhandled', input.eventPayload, newEventProperties, eventTrace)

    }
}
