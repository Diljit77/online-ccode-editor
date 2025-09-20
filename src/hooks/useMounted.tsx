"use client"
import { useEffect, useState } from "react"

const useMounted=()=>{
  const [mounted,setmounted]=useState(false);
  useEffect(()=>{
    setmounted(true);
  },[]);
  return mounted ;

};
export default useMounted;

