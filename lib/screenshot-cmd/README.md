# screenshot-cmd
Simple command-line tool for making screenshots (for Windows Vista or later)

Fork from https://code.google.com/archive/p/screenshot-cmd/
-----------------------------------------------------------
Fixed so that the drop shadow of the window frame does not appear.  
(ウィンドウフレームのドロップシャドウが映らないように修正した)

To build:
> g++ -Wall -Os -mwindows -municode screenshot.cpp -lgdiplus -lDwmapi -o screenshot -static

To reduce the size:
> strip screenshot.exe

To run:
> screenshot.exe -wh 1e9060a -o screenshot.png
