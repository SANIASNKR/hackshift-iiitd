import React,{createContext,useContext,useEffect,useState} from 'react';
import {api,post,User} from './api';
type Auth={user:User|null;loading:boolean;login:(username:string,password:string)=>Promise<void>;logout:()=>void};
const Context=createContext<Auth|null>(null);
export const useAuth=()=>{const x=useContext(Context);if(!x)throw new Error('Auth missing');return x};
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{if(!localStorage.getItem('ayu-demo-token')){setLoading(false);return}api<User>('/auth/me').then(setUser).catch(()=>localStorage.removeItem('ayu-demo-token')).finally(()=>setLoading(false))},[]);
  const login=async(username:string,password:string)=>{const result=await post<{token:string;user:User}>('/auth/login',{username,password});localStorage.setItem('ayu-demo-token',result.token);setUser(result.user)};
  const logout=()=>{localStorage.removeItem('ayu-demo-token');localStorage.removeItem('ayu-cursor');setUser(null)};
  return <Context.Provider value={{user,loading,login,logout}}>{children}</Context.Provider>
}
