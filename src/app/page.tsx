"use client";

import { MoonCard } from "@/components/moon";
import { ProverbsCard } from "@/components/proverbs";
import { WeatherCard } from "@/components/weather";
import { AgentState } from "@/lib/types";
import type { AgentSubscriber } from "@ag-ui/client";
import {
  useCoAgent,
  useCoAgentStateRender,
  useCopilotReadable,
  useDefaultTool,
  useFrontendTool,
  useHumanInTheLoop,
  useRenderToolCall,
} from "@copilotkit/react-core";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useEffect, useState } from "react";

export default function CopilotKitPage() {
  const agent = useAgent({ agentId: "my_agent" });
  const [themeColor, setThemeColor] = useState("#6366f1");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/pydantic-ai/frontend-actions
  useFrontendTool({
    name: "setThemeColor",
    parameters: [
      {
        name: "themeColor",
        description: "The theme color to set. Make sure to pick nice colors.",
        required: true,
      },
    ],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  useCopilotReadable({
    description: "Name of the user",
    value: "Bob",
  });

  useFrontendTool({
    name: "sayHello",
    description: "Say hello to the user",
    parameters: [
      {
        name: "name",
        type: "string",
        description: "The name of the user to say hello to",
        required: true,
      },
    ],
    handler({ name }) {
      // Handler returns the result of the tool call
      return { currentURLPath: window.location.href, userName: name };
    },
    render: ({ args }) => {
      // Renders UI based on the data of the tool call
      return (
        <div>
          <h1>Hello, {args.name}!</h1>
          <h1>You're currently on {window.location.href}</h1>
        </div>
      );
    },
  });

  return (
    <main
      style={
        { "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties
      }
    >
      <CopilotSidebar
        defaultOpen={true}
        disableSystemMessage={true}
        clickOutsideToClose={false}
        labels={{
          title: "Popup Assistant",
          initial: "👋 Hi, there! You're chatting with an agent.",
        }}
        suggestions={[
          {
            title: "Generative UI",
            message: "Get the weather in San Francisco.",
          },
          {
            title: "Frontend Tools",
            message: "Set the theme to green.",
          },
          {
            title: "Human In the Loop",
            message: "Please go to the moon.",
          },
          {
            title: "Write Agent State",
            message: "Add a proverb about AI.",
          },
          {
            title: "Update Agent State",
            message:
              "Please remove 1 random proverb from the list if there are any.",
          },
          {
            title: "Read Agent State",
            message: "What are the proverbs?",
          },
        ]}
      >
        <YourMainContent themeColor={themeColor} />
      </CopilotSidebar>
    </main>
  );
}

function YourMainContent({ themeColor }: { themeColor: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/pydantic-ai/shared-state
  const { state, setState, run } = useCoAgent<AgentState>({
    name: "my_agent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but its the best thing since sliced bread.",
      ],
      language: "english",
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/pydantic-ai/generative-ui
  useRenderToolCall(
    {
      name: "get_weather",
      description: "Get the weather for a given location.",
      parameters: [{ name: "location", type: "string", required: true }],
      render: ({ args, result }) => {
        return <WeatherCard location={args.location} themeColor={themeColor} />;
      },
    },
    [themeColor]
  );

  // 🪁 Human In the Loop: https://docs.copilotkit.ai/pydantic-ai/human-in-the-loop
  useHumanInTheLoop(
    {
      name: "go_to_moon",
      description: "Go to the moon on request.",
      render: ({ respond, status }) => {
        return (
          <MoonCard themeColor={themeColor} status={status} respond={respond} />
        );
      },
    },
    [themeColor]
  );

  useCoAgentStateRender<AgentState>({
    name: "my_agent", // MUST match the agent name in CopilotRuntime
    render: ({ state }) => (
      <div>
        {state.searches?.map((search, index) => (
          <div key={index}>
            {search.done ? "✅" : "❌"} {search.query}
            {search.done ? "" : "..."}
          </div>
        ))}
      </div>
    ),
  });

  useDefaultTool({
    render: ({ name, args, status, result }) => {
      return (
        <div style={{ color: "black" }}>
          <span>
            {status === "complete" ? "✓" : "⏳"}
            {name}
          </span>
          {status === "complete" && result && (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      );
    },
  });

  const toggleLanguage = () => {
    setState({
      ...state,
      language: state.language === "english" ? "spanish" : "english",
    });
  };

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="h-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <ProverbsCard state={state} setState={setState} />
      <AgentDashboard />
    </div>
  );
}

function AgentInfo() {
  const { agent } = useAgent({ agentId: "my_agent" });

  return (
    <div>
      <p>Agent ID: {agent.agentId}</p>
      <p>Thread ID: {agent.threadId}</p>
      <p>Status: {agent.isRunning ? "Running" : "Idle"}</p>
      <p>Messages: {agent.messages.length}</p>
    </div>
  );
}

function MessageList() {
  const { agent } = useAgent({ agentId: "my_agent" });

  return (
    <div>
      {agent.messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong>
          <span>{JSON.stringify(msg.content)}</span>
        </div>
      ))}
    </div>
  );
}

function AgentStatus() {
  const { agent } = useAgent({ agentId: "my_agent" });

  return (
    <div>
      {agent.isRunning ? (
        <div>
          <div className="spinner" />
          <span>Agent is processing...</span>
        </div>
      ) : (
        <span>Ready</span>
      )}
    </div>
  );
}

function StateDisplay() {
  const { agent } = useAgent({ agentId: "my_agent" });

  return (
    <div>
      <h3>Agent State</h3>
      <pre>{JSON.stringify(agent.state, null, 2)}</pre>

      {/* Access specific properties */}
      {agent.state.user_name && <p>User: {agent.state.user_name}</p>}
      {agent.state.preferences && (
        <p>Preferences: {JSON.stringify(agent.state.preferences)}</p>
      )}
    </div>
  );
}

function ThemeSelector() {
  const { agent } = useAgent({ agentId: "my_agent" });

  const updateTheme = (theme: string) => {
    agent.setState({
      ...agent.state,
      user_theme: theme,
    });
  };

  return (
    <div>
      <button onClick={() => updateTheme("dark")}>Dark Mode</button>
      <button onClick={() => updateTheme("light")}>Light Mode</button>
      <p>Current: {agent.state.user_theme || "default"}</p>
    </div>
  );
}

function EventLogger() {
  const { agent } = useAgent({ agentId: "my_agent" });

  useEffect(() => {
    const subscriber: AgentSubscriber = {
      onCustomEvent: ({ event }) => {
        console.log("Custom event:", event.name, event.value);
      },
      onRunStartedEvent: () => {
        console.log("Agent started running");
      },
      onRunFinalized: () => {
        console.log("Agent finished running");
      },
      onStateChanged: (state) => {
        console.log("State changed:", state);
      },
    };

    const { unsubscribe } = agent.subscribe(subscriber);
    return () => unsubscribe();
  }, []);

  return null;
}

function AgentDashboard() {
  const { agent } = useAgent({ agentId: "my_agent" });
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Status */}
      <div className="p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Agent Status</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                agent.isRunning ? "bg-yellow-500 animate-pulse" : "bg-green-500"
              }`}
            />
            <span>{agent.isRunning ? "Running" : "Idle"}</span>
          </div>
          {/* <div>Thread: {agent.threadId}</div> */}
          <div>Messages: {agent.messages.length}</div>
        </div>
      </div>
      {/* State */}
      <div className="p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Agent State</h2>
        <pre className="p-4 rounded text-sm overflow-auto">
          {JSON.stringify(agent.state, null, 2)}
        </pre>
      </div>
      {/* Messages */}
      <div className="p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Conversation</h2>
        <div className="space-y-3">
          {agent.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === "user" ? "ml-8" : "mr-8"
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {msg.role === "user" ? "You" : "Agent"}
              </div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
