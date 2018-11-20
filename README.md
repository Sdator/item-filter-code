## Item Filter Support for Visual Studio Code

An extension for Visual Studio Code that provides additional support for writing [Path of Exile](https://www.pathofexile.com/) item filters, making it easier to create item filters for the game.

### Features

- Syntax support for item filters, colorizing the text within your editor.
- Autocompletion for item classes and bases, as well as all rule keywords.
- Diagnostics support, enabling error checking as you edit.
- Color picker support for all rules with a color as a value.
- A hover provider, providing additional information through tooltips.
- Preview sounds by hovering over sound identifiers within the editor.
  + If you are using Linux, please see the [Sound Support on Linux](#sound-support-on-linux) section.
- Highly configurable, including the ability to add custom item bases, item classes, and rule keywords.
- Non-destructive implementation. We will never edit, destroy, or sort anything without your permission.

### Preview

![Item Filter Code Preview](https://raw.githubusercontent.com/GlenCFL/item-filter-code/master/assets/images/preview.png)

### Sound Support on Linux

Visual Studio Code doesn't provide any APIs for playing sound to extension writers, which means we have to use either external binaries or native node modules to provide that support ourselves. This extension goes with the former, as it is much less prone to breakage from update to update. In the case of Linux, we cannot expect to bundle an executable that is suitable for all systems. All Linux systems also do not ship with a sound-playing executable matching our requirements.

Our solution to this is to defer to your own ability to install [mpg123](https://www.mpg123.de/) onto your system. You can then either have it available within your `PATH` variable and set `item-filter.linuxMPGAvailable` to true or you can set the value of `item-filter.linuxMPGPath` to point directly to the executable (with execution permission) on your system.

On Ubuntu, you can install `mpg123` using this command:
```bash
sudo apt-get install mpg123
```
This will install `mpg123` into a location that will be within your `PATH` variable. Once installed, you'd just need to set `item-filter.linuxMPGAvailable` to true within your Visual Studio Code settings.

### Issues & Feature Requests

Issues filed on the [Github tracker](https://github.com/GlenCFL/item-filter-code/issues) will be resolved in a quick and timely manner. If you have a feature request, those are welcome on the tracker as well.

### Developer References

Several references are maintained by this project, which provide information on the implementation of item filters within the Path of Exile client.

- [Notes](https://github.com/GlenCFL/item-filter-code/blob/master/docs/notes.md) - any tidbit of information deemed to be important to understanding item filters and the rules governing the display of item drops within the client.
- [Syntax](https://github.com/GlenCFL/item-filter-code/blob/master/docs/syntax.md) - extensive, organized information on the syntax of item filters.
- [Whitespace](https://github.com/GlenCFL/item-filter-code/blob/master/docs/whitespace.md) - details how the game interprets various unicode whitespace characters.
