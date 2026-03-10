"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalWindowProps {
  containerId: string;
}

export default function TerminalWindow({ containerId }: TerminalWindowProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#f0f0f0",
        cursor: "#f0f0f0",
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    // Use the API URL from environment, fallback to current host if not set
    const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.host}/api/v1`;
    const wsBase = publicApiUrl.replace(/^http/, "ws");
    const token = typeof window !== "undefined" ? localStorage.getItem("opswatch_token") : "";
    
    // Construct the terminal WS URL. 
    // If publicApiUrl ends with /api/v1, we need to append /containers/...
    // If it's just the host, we adjust accordingly.
    const wsUrl = `${wsBase}/containers/${containerId}/terminal${token ? `?token=${token}` : ""}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus("connected");
      term.focus();
    };

    ws.onmessage = async (event) => {
      let data = event.data;
      if (data instanceof Blob) {
        data = await data.text();
      }
      term.write(data);
    };

    ws.onclose = () => {
      setStatus("disconnected");
      term.write("\r\n\r\nConnection closed.");
    };

    ws.onerror = (error) => {
      setStatus("error");
      term.write("\r\n\r\nConnection error. Check proxy or agent status.");
      console.error("WebSocket error:", error);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [containerId]);

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-sm text-gray-400 font-mono">Container Terminal Shell</div>
        <div className="flex items-center">
          {status === "connecting" && <span className="text-yellow-500 text-xs font-medium">Connecting...</span>}
          {status === "connected" && <span className="text-green-500 text-xs font-medium">Connected</span>}
          {status === "disconnected" && <span className="text-red-500 text-xs font-medium">Disconnected</span>}
          {status === "error" && <span className="text-red-500 text-xs font-bold">Connection Error</span>}
        </div>
      </div>
      <div className="flex-1 p-2" ref={terminalRef}></div>
    </div>
  );
}
