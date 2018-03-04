Performance in item filters is a mix of removing rules quickly and removing items from the pool of drops quickly.

Our ordering is currently:
1. LinkedSockets
2. Sockets
3. Quality
4. Height
5. Width
6. Identified
7. Corrupted
8. ElderItem
9. ShaperItem
10. ShapedMap
11. ElderMap
12. ItemLevel
13. DropLevel
14. SocketGroup
15. Rarity
16. Class
17. BaseType
18. Unknown entities.
19. Action rules.

As you can see, we ultimately want to avoid the very costly `BaseType` rule, with other string-based rules being towards the bottom as well. This is also essentially the reverse of how most people will write item filters, with `Class` and `BaseType` typically starting each block.

One of the principles of the extension is that we are not destructive and we do not alter anything without permission of the user. We group unknown entities within a block in the same order which they originally appeared, while doing the same thing for the cosmetic action rules as well.
