import{c as r,j as o,Z as u,i as l}from"./index.4c085f80.js";import{R as _}from"./rotate-cw.f6a28e9d.js";import{d as g}from"./debounce.d080d5e1.js";const x="_rotate_1dspl_1",p="_isRotating_1dspl_5",R="_rotating_1dspl_1";var i={rotate:x,isRotating:p,rotating:R};function I(t){const e=t.size||16,n=r(i.rotate,{[i.isRotating]:t.isRotating});return o("span",{className:n,children:o(_,{size:e})})}const{useCallback:d,useState:m,useMemo:f}=l;function h(t){const[,e]=u(t),[n,c]=m(""),a=f(()=>g(e,300),[e]);return[d(s=>{c(s.target.value),a(s.target.value)},[a]),n]}const T="_input_16a1f_1";var v={input:T};function N(t){const[e,n]=h(t.textAtom);return o("input",{className:v.input,type:"text",value:n,onChange:e,placeholder:t.placeholder})}export{I as R,N as T};
