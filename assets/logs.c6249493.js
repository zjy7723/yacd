var $=Object.defineProperty,k=Object.defineProperties;var y=Object.getOwnPropertyDescriptors;var h=Object.getOwnPropertySymbols;var E=Object.prototype.hasOwnProperty,H=Object.prototype.propertyIsEnumerable;var S=(e,t,n)=>t in e?$(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,b=(e,t)=>{for(var n in t||(t={}))E.call(t,n)&&S(e,n,t[n]);if(h)for(var n of h(t))H.call(t,n)&&S(e,n,t[n]);return e},v=(e,t)=>k(e,y(t));import{H as J,J as O,K as u}from"./index.4c085f80.js";const L="/logs",R=new TextDecoder("utf-8"),x=()=>Math.floor((1+Math.random())*65536).toString(16);let p=!1,i=!1,f="",s,g;function m(e,t){let n;try{n=JSON.parse(e)}catch{console.log("JSON.parse error",JSON.parse(e))}const r=new Date,l=A(r);n.time=l,n.id=+r-0+x(),n.even=p=!p,t(n)}function A(e){const t=e.getFullYear()%100,n=u(e.getMonth()+1,2),r=u(e.getDate(),2),l=u(e.getHours(),2),o=u(e.getMinutes(),2),c=u(e.getSeconds(),2);return`${t}-${n}-${r} ${l}:${o}:${c}`}function M(e,t){return e.read().then(({done:n,value:r})=>{f+=R.decode(r,{stream:!n});const o=f.split(`
`),c=o[o.length-1];for(let d=0;d<o.length-1;d++)m(o[d],t);if(n){m(c,t),f="",console.log("GET /logs streaming done"),i=!1;return}else f=c;return M(e,t)})}function w(e){const t=Object.keys(e);return t.sort(),t.map(n=>e[n]).join("|")}let D,a;function F(e,t){if(e.logLevel==="uninit"||i||s&&s.readyState===1)return;g=t;const n=J(e,L);s=new WebSocket(n),s.addEventListener("error",()=>{N(e,t)}),s.addEventListener("message",function(r){m(r.data,t)})}function Y(){s.close(),a&&a.abort()}function j(e){!g||!s||(s.close(),i=!1,F(e,g))}function N(e,t){if(a&&w(e)!==D)a.abort();else if(i)return;i=!0,D=w(e),a=new AbortController;const n=a.signal,{url:r,init:l}=O(e);fetch(r+L+"?level="+e.logLevel,v(b({},l),{signal:n})).then(o=>{const c=o.body.getReader();M(c,t)},o=>{i=!1,!n.aborted&&console.log("GET /logs error:",o.message)})}export{F as f,j as r,Y as s};
