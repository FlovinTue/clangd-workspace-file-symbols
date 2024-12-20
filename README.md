# Clangd Workspace File Symbols

Upgrade your `Go To Symbols In Workspace` to fake the ReSharper/Jetbrains `Search Everywhere` feature!

## Features

This extension allows you to add your workspace files as symbols to the `Go To Symbols In Workspace` command results. This allows
for a more holistic search experience, resembling that of ReSharper's/Jetbrains `Search Everywhere`. 

## Requirements

This extension requires the clangd extension to be installed and active to function

## Extension Settings

To control what kind of files shows up in your workspace symbols query, you can specify search inclusion & inclusion pattern.
These patterns should be formatted in the same way as you would when calling the findFiles function (see https://code.visualstudio.com/api/references/vscode-api#workspace)
as they are forwarded directly to just that.

Example include filter: `"**/*.{h,hpp,c,cpp}"` for including all C & C++ headers and source files
