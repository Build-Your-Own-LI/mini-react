# mini-react

参考：
https://webdeveloper.beehiiv.com/p/build-react-400-lines-code

上記ではビルド時に
```json
"jsx": "react-jsx"
```
を用いており、React依存になっていたため、
```json
"jsx": "preserve"
```
とすることでReact依存を引きはがした。("react"でもreactライブラリへの依存はないが、こっちの方がBuild-Your-Ownぽかった)

[公式](https://www.typescriptlang.org/tsconfig/#jsx)

ついでにyarn PnPも使ってみた
