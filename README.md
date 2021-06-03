# excevent
[![GitHub issues](https://img.shields.io/github/issues/WaywardGame/excevent.svg?style=flat-square)](https://github.com/WaywardGame/excevent)
[![Travis](https://img.shields.io/travis/com/WaywardGame/excevent.svg?style=flat-square)](https://travis-ci.com/WaywardGame/excevent)

A ridiculously powerful and easy-to-use event system. 🚀

# How it works

## The core: `EventEmitter`

This class can emit strongly-typed events. It's meant for use in any class, just add an `event` field with the emitter in it. 

Here's an example:

```ts

interface ITestEvents {
	sayHello(name: string): any;
	sayGoodbye(name: string): any;
}

const emitter = new EventEmitter<any, ITestEvents>({});

emitter.emit("sayHello", "David"); // Success! We emitted the "sayHello" event with the correct parameters
emitter.emit("sayHello", 1); // Type error! We expect a name here, not a number

emitter.subscribe("sayHello", (_, name) => {
	console.log("Hello", name);
});

emitter.emit("sayHello", "Susan"); // logs "Hello Susan"

```

`emit` returns an array of the results from all calls.

Emitters always have a "host", which is the class they're in. Here's an example of using `EventEmitter.Host` as a superclass, and some inheritance:

```ts
interface ITestEvents {
	sayHello(name: string): any;
}

class Test extends EventEmitter.Host<ITestEvents> {}

const test = new Test();
test.event.emit("sayHello", "Johnny"); // `Test` extends `EventEmitter.Host`, which has a field `event: EventEmitter`

interface ITest2Events extends ITestEvents {
	sayGoodbye(name: string): any;
}

class Test2 extends Test {
	public readonly event: EventEmitter<this, ITest2Events>; // override with an emitter of additional events
}

const test2 = new Test2();
test2.event.emit("sayHello", "Kevin");
test2.event.emit("sayGoodbye", "Rachel");

```

There's more stuff you can do with a basic EventEmitter but, as per all open source projects, I'll save writing full docs for later~


## Managing events project-wide: `Excevent`

The `Excevent` class is for setting up events project-wide, using "event buses".

An event bus allows subscribers to subscribe to potentially multiple different emitters of the same type. The emitters can also seamlessly change over time.

### Setup

It's important that your file setting up excevent does not import actual classes, as this can cause circular dependencies and potentially issues. The excevent setup file should only declare the `EventBus` enum (or whatever else you decide to use for your event bus names), and the type of each event bus.

```ts
import type Foo from "./Foo";
import type Bar from "./Bar";

export enum EventBus {
	Foo,
	Bar,
}

export interface IEventBuses {
	[EventBus.Foo]: typeof Foo; // EventBus.Foo should include all events from all instances of the Foo class
	[EventBus.Bar]: Bar; // EventBus.Bar should include all events from the single registered instance of the Bar class
}

export const events = new Excevent<IEventBuses>();
export const EventHandler = excevent.getEventHandlerDecorator();
```

And then elsewhere, you register the classes or instances to the event bus. As an example:

```ts
import { events, EventBus } from "./Events";

interface IFooEvents {
	foo(): any;
}

export default class Foo extends EventEmitter.Host<IFooEvents> {}

events.registerBus(EventBus.Foo, Foo); // registers the Foo class to its event bus
```

Or, in the case of an instance:

```ts
import { events, EventBus } from "./Events";

interface IBarEvents {
	bar(): any;
}

export default class Bar extends EventEmitter.Host<IBarEvents> {
	public static readonly INSTANCE = new Bar();
}

events.registerBus(EventBus.Bar, Bar.INSTANCE); // registers a single instance of the Bar class to its event bus
```

### Subscribing methods to events: `@EventHandler`

TODO
