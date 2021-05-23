# JSON Merge Extend

## Attribute
- Interactive operation! You only answer some question.
- Offer a binary executor. 
- Support variable replacement.
- Search the working file intelligently.
- Check invalid replacement.

## Usage

*With Node.js*
```js
npm install -g 
```
*With binary executor*
1. Go to [release page](https://github.com/LittleMoi/json-mergex/releases) and download file for your platform.
1. (For windows) Double-click at the `json-mergex-win.exe`.
1. (For macos/linux) Execute the `json-mergex-xxx` in *Terminate*.

You can check the version via `json-mergex -V` or look for help via `json-mergex -h`.

## Example
### Prepare the source data
New the file named "data.json" in working space. The content is:
```json
{
    "name": "LittleMoi",
    "age": 18,
    "skill": {
        "JavaScript": 100,
        "CSharp": "$csharp-grade",
        "Java": 50
    } 
}
```

### Prepare the merge data
New the file named "data.merge.json" in working space. We want modify the age and the grade of "Java". So the content of file is: 
```json
{
    "$prop": {
        "charp-grade"
    }
    "age": 22,
    "skill": {
        "Java": 120,
        "CSharp": "$charp-grade"
    }
}
```

### Replacement
We hava two options: *Manual* or *Interactive*.

*Manual*
Execute the command:
```sh
$ json-mergex --src data.json --merge data.merge.json --dst data.merged.json
```

And we cant checkout the result. It is simple!

*Interacitve*
```sh
$ json-mergex
Find merge file: X:/xxx/data.merge.json
Find src file: X:/xxx/data.json
? The dst path is empty, can you confirm to override the source file? » (Y/n) ...no
Replace: age
Replace: skill.Java
Replace: skill.CSharp
Process any key to continue...
```

The program will globby with your `__dirname`, used the pattern "*.merge.json"(This is "data.merge.json"). Then guest the source file's name is "data.json".