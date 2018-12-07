## General Notes on Item Filters

- Items of the `Quest Items` class cannot be hidden.
- There is a lot of oddity surrounding Elder and Shaper items in-game. They seem to disable certain other attributes within item filters, like `Quality`.
- Even though Prophecies are a droppable item, the names of each prophecy are not registered as valid `BaseType` values within the game.
- String values can seemingly have one trailing space, for example "Chaos Orb " is considered valid. This will result in a failed match on a Chaos Orb drop.
