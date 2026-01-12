import asyncio
from textwrap import dedent

from ag_ui.core import EventType, StateSnapshotEvent

# load environment variables
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.ag_ui import StateDeps
from pydantic_ai.models.openai import OpenAIResponsesModel

load_dotenv()


# =====
# State
# =====
class Search(BaseModel):
    query: str
    done: bool


class AgentState(BaseModel):
    """List of the proverbs being written."""

    proverbs: list[str] = Field(
        default_factory=list,
        description="The list of already written proverbs",
    )
    searches: list[Search] = Field(default_factory=list)

# =====
# Agent
# =====
agent = Agent(
    model=OpenAIResponsesModel("gpt-4.1-mini"),
    deps_type=StateDeps[AgentState],
    system_prompt=dedent("""
    You are a helpful assistant that helps manage and discuss proverbs.

    The user has a list of proverbs that you can help them manage.
    You have tools available to add, set, or retrieve proverbs from the list.

    When discussing proverbs, ALWAYS use the get_proverbs tool to see the current list before
    mentioning, updating, or discussing proverbs with the user.
  """).strip(),
)

# =====
# Tools
# =====
@agent.tool
def get_proverbs(ctx: RunContext[StateDeps[AgentState]]) -> list[str]:
  """Get the current list of proverbs."""
  print(f"📖 Getting proverbs: {ctx.deps.state.proverbs}")
  return ctx.deps.state.proverbs

@agent.tool
async def add_proverbs(
    ctx: RunContext[StateDeps[AgentState]], proverbs: list[str]
) -> StateSnapshotEvent:
  ctx.deps.state.proverbs.extend(proverbs)
  return StateSnapshotEvent(
    type=EventType.STATE_SNAPSHOT,
    snapshot=ctx.deps.state,
  )

@agent.tool
async def set_proverbs(
    ctx: RunContext[StateDeps[AgentState]], proverbs: list[str]
) -> StateSnapshotEvent:
  ctx.deps.state.proverbs = proverbs
  return StateSnapshotEvent(
    type=EventType.STATE_SNAPSHOT,
    snapshot=ctx.deps.state,
  )


@agent.tool
def get_weather(_: RunContext[StateDeps[AgentState]], location: str) -> str:
  """Get the weather for a given location. Ensure location is fully spelled out."""
  return f"The weather in {location} is sunny."


@agent.tool
async def add_search(
    ctx: RunContext[StateDeps[AgentState]], new_query: str
) -> StateSnapshotEvent:
    """Add a search to the agent's list of searches."""
    new_search = Search(query=new_query, done=False)
    searches = ctx.deps.state.searches
    searches.append(new_search)
    agent_state = ctx.deps.state.model_copy(update={"searches": searches})
    ctx.deps.state = agent_state
    return StateSnapshotEvent(type=EventType.STATE_SNAPSHOT, snapshot=agent_state)


@agent.tool
async def run_searches(ctx: RunContext[StateDeps[AgentState]]) -> StateSnapshotEvent:
    """Run the searches in the agent's state."""
    searches = ctx.deps.state.searches
    for search in searches:
        await asyncio.sleep(1)
        search.done = True
    agent_state = ctx.deps.state.model_copy(update={"searches": searches})
    ctx.deps.state = agent_state
    return StateSnapshotEvent(type=EventType.STATE_SNAPSHOT, snapshot=agent_state)


@agent.instructions()
async def search_instructions(ctx: RunContext[StateDeps[AgentState]]) -> str:
    """Instructions for the search agent."""
    return dedent(
        f"""
        You are a helpful assistant for storing searches.

        IMPORTANT:
        - Use the `add_search` tool to add a search to the agent's state
        - After using the `add_search` tool, YOU MUST ALWAYS use the `run_searches` tool to run the searches
        - ONLY USE THE `add_search` TOOL ONCE FOR A GIVEN QUERY
        Current searches:
        {ctx.deps.state.model_dump_json(indent=2)}
        """
    )
