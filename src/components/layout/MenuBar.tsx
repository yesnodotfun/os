import { useState, useEffect } from "react";
import { AppleMenu } from "./AppleMenu";
import { useAppContext } from "@/contexts/AppContext";

interface MenuBarProps {
  children?: React.ReactNode;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ml-auto mr-2">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

export function MenuBar({ children }: MenuBarProps) {
  const { apps } = useAppContext();

  return (
    <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center z-50">
      <AppleMenu apps={apps} />
      {children}
      <Clock />
    </div>
  );
}
