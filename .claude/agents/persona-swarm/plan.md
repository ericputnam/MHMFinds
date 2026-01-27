# Persona-Swarm Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-25

---

## Purpose

The Persona-Swarm agent validates affiliate product recommendations through 5 simulated user personas representing the MHMFinds audience demographics. Each persona evaluates products from their unique perspective, and products must achieve majority approval (3/5) to pass validation.

## Problem Statement

Current affiliate strategy has 0% conversion because products don't match the audience:
- 75%+ female, ages 18-34
- Pinterest-driven (66% of traffic)
- Interested in fashion, beauty, home decor
- **NOT** gaming peripherals or tech

## Scope

### In Scope
- 5 user personas representing different audience segments
- Product evaluation from each persona's perspective
- Voting logic (3/5 majority approval)
- Automated batch validation after research
- Interactive chat mode for brainstorming

### Out of Scope
- Real user testing (these are simulated personas)
- A/B testing (handled separately)
- Actual purchase verification

---

## The 5 Personas

| Name | Age | Location | Aesthetic | Income | Key Trait |
|------|-----|----------|-----------|--------|-----------|
| **Emily** | 25 | Ohio, USA | Cottagecore/Modern | $45K | Pinterest power user, marketing job |
| **Sofia** | 22 | São Paulo, Brazil | Y2K/Trendy | $25K | TikTok-driven, loves bold looks |
| **Luna** | 28 | London, UK | Goth/Alternative | $38K | Dark aesthetics, quality over quantity |
| **Mia** | 19 | Texas, USA | Budget Student | $12K | Price-sensitive, dorm decor focus |
| **Claire** | 32 | Toronto, Canada | Professional/Minimal | $65K | Disposable income, curated purchases |

### Persona Definitions

```typescript
interface Persona {
  id: string;
  name: string;
  role: string;
  focusAreas: string[];
  voteWeight: number;
  evaluationPrompt: string;
}

const personas: Persona[] = [
  {
    id: 'architect',
    name: 'Architect',
    role: 'System Design Expert',
    focusAreas: ['architecture', 'scalability', 'patterns', 'dependencies'],
    voteWeight: 1.5,
    evaluationPrompt: `Evaluate this decision from an architectural perspective:
      - Does it follow established patterns in the codebase?
      - Are there scalability concerns?
      - How does it affect system dependencies?
      - Is the abstraction level appropriate?`
  },
  {
    id: 'guardian',
    name: 'Guardian',
    role: 'Security & Reliability Expert',
    focusAreas: ['security', 'error-handling', 'edge-cases', 'data-integrity'],
    voteWeight: 1.5,
    evaluationPrompt: `Evaluate this decision from a security and reliability perspective:
      - Are there security vulnerabilities?
      - How are errors and edge cases handled?
      - Could this cause data loss or corruption?
      - What failure modes exist?`
  },
  {
    id: 'advocate',
    name: 'Advocate',
    role: 'User Experience Champion',
    focusAreas: ['usability', 'accessibility', 'simplicity', 'user-impact'],
    voteWeight: 1.0,
    evaluationPrompt: `Evaluate this decision from a user experience perspective:
      - How does this affect the end user?
      - Is the solution intuitive and simple?
      - Are there accessibility concerns?
      - Does it add unnecessary complexity for users?`
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    role: 'Implementation Realist',
    focusAreas: ['effort', 'timeline', 'technical-debt', 'risk'],
    voteWeight: 1.0,
    evaluationPrompt: `Evaluate this decision from a practical implementation perspective:
      - How much effort is required?
      - What are the risks and unknowns?
      - Does this create technical debt?
      - Is there a simpler alternative?`
  },
  {
    id: 'curator',
    name: 'Curator',
    role: 'Quality Gatekeeper',
    focusAreas: ['code-quality', 'maintainability', 'documentation', 'testing'],
    voteWeight: 1.0,
    evaluationPrompt: `Evaluate this decision from a code quality perspective:
      - Is the code maintainable and readable?
      - Are tests adequate?
      - Is documentation sufficient?
      - Does it follow project conventions?`
  }
];
```

---

## Voting Logic

### Evaluation Response Format

Each persona produces a structured evaluation:

```typescript
interface PersonaEvaluation {
  personaId: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number; // 0.0 to 1.0
  concerns: string[];
  suggestions: string[];
  reasoning: string;
}
```

### Vote Aggregation

```typescript
interface VoteResult {
  decision: 'approved' | 'rejected' | 'needs-discussion';
  totalWeightedVotes: number;
  approveWeight: number;
  rejectWeight: number;
  abstainWeight: number;
  consensusLevel: 'unanimous' | 'strong' | 'weak' | 'split';
  dissent: PersonaEvaluation[];
  keyActions: string[];
}

function aggregateVotes(evaluations: PersonaEvaluation[]): VoteResult {
  let approveWeight = 0;
  let rejectWeight = 0;
  let abstainWeight = 0;
  const dissent: PersonaEvaluation[] = [];
  const allSuggestions: string[] = [];

  for (const evaluation of evaluations) {
    const persona = personas.find(p => p.id === evaluation.personaId);
    const weight = persona.voteWeight * evaluation.confidence;

    switch (evaluation.vote) {
      case 'approve':
        approveWeight += weight;
        break;
      case 'reject':
        rejectWeight += weight;
        dissent.push(evaluation);
        break;
      case 'abstain':
        abstainWeight += weight;
        break;
    }

    allSuggestions.push(...evaluation.suggestions);
  }

  const totalWeightedVotes = approveWeight + rejectWeight + abstainWeight;
  const approveRatio = approveWeight / totalWeightedVotes;

  // Determine decision
  let decision: 'approved' | 'rejected' | 'needs-discussion';
  if (approveRatio >= 0.7) {
    decision = 'approved';
  } else if (approveRatio <= 0.3) {
    decision = 'rejected';
  } else {
    decision = 'needs-discussion';
  }

  // Determine consensus level
  let consensusLevel: 'unanimous' | 'strong' | 'weak' | 'split';
  if (dissent.length === 0 && abstainWeight === 0) {
    consensusLevel = 'unanimous';
  } else if (approveRatio >= 0.8 || approveRatio <= 0.2) {
    consensusLevel = 'strong';
  } else if (approveRatio >= 0.6 || approveRatio <= 0.4) {
    consensusLevel = 'weak';
  } else {
    consensusLevel = 'split';
  }

  return {
    decision,
    totalWeightedVotes,
    approveWeight,
    rejectWeight,
    abstainWeight,
    consensusLevel,
    dissent,
    keyActions: [...new Set(allSuggestions)].slice(0, 5),
  };
}
```

### Tie-Breaker Rules

When votes are split (40-60% range):

1. **Guardian veto**: If Guardian votes `reject` with confidence > 0.8, decision becomes `rejected`
2. **Architect tiebreak**: If tied, Architect's vote decides
3. **Escalate**: If still unclear, mark as `needs-discussion` for human input

```typescript
function applyTieBreaker(result: VoteResult, evaluations: PersonaEvaluation[]): VoteResult {
  if (result.decision !== 'needs-discussion') {
    return result;
  }

  // Rule 1: Guardian veto on security/reliability concerns
  const guardianEval = evaluations.find(e => e.personaId === 'guardian');
  if (guardianEval?.vote === 'reject' && guardianEval.confidence > 0.8) {
    return {
      ...result,
      decision: 'rejected',
      consensusLevel: 'weak',
    };
  }

  // Rule 2: Architect tiebreak
  const architectEval = evaluations.find(e => e.personaId === 'architect');
  if (architectEval?.vote !== 'abstain') {
    return {
      ...result,
      decision: architectEval.vote === 'approve' ? 'approved' : 'rejected',
      consensusLevel: 'weak',
    };
  }

  // Rule 3: Escalate to human
  return result;
}
```

---

## Workflow

```
                    Persona-Swarm Agent Flow
                              |
                              v
                    +------------------+
                    | Receive decision |
                    | request          |
                    +--------+---------+
                              |
                              v
                    +------------------+
                    | Parse context &  |
                    | options          |
                    +--------+---------+
                              |
                              v
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
    +---------+          +---------+          +---------+
    |Architect|          | Guardian|          | Advocate|
    | evaluate|          | evaluate|          | evaluate|
    +----+----+          +----+----+          +----+----+
         |                    |                    |
         v                    v                    v
    +---------+          +---------+
    |Pragmatist|         | Curator |
    | evaluate |         | evaluate|
    +----+----+          +----+----+
         |                    |
         +--------------------+
                              |
                              v
                    +------------------+
                    | Aggregate votes  |
                    | & apply weights  |
                    +--------+---------+
                              |
                              v
                    +------------------+
                    | Apply tie-breaker|
                    | rules if needed  |
                    +--------+---------+
                              |
                              v
                    +------------------+
                    | Generate report  |
                    | with actions     |
                    +------------------+
```

---

## Decision Types

The swarm can evaluate different types of decisions:

### 1. Implementation Approach
```
Question: Should we use approach A or approach B?
Options: [{ id: 'A', description: '...' }, { id: 'B', description: '...' }]
Context: Current architecture, constraints, requirements
```

### 2. Code Review
```
Question: Should we approve this code change?
Options: [{ id: 'approve', description: 'Merge as-is' },
          { id: 'revise', description: 'Request changes' }]
Context: Diff, affected files, test coverage
```

### 3. Architecture Decision
```
Question: Which database design should we use?
Options: [{ id: 'normalized', description: '...' },
          { id: 'denormalized', description: '...' }]
Context: Query patterns, scale requirements, consistency needs
```

### 4. Risk Assessment
```
Question: Is this deployment safe to proceed?
Options: [{ id: 'proceed', description: 'Deploy now' },
          { id: 'delay', description: 'Wait and gather more info' }]
Context: Test results, dependencies, rollback plan
```

---

## Report Format

### Swarm Evaluation Report
```markdown
# Swarm Evaluation Report
Generated: 2026-01-25T10:30:00Z

## Decision Request
**Question:** Should we implement feature X using approach A or B?

### Option A: Microservice Architecture
- Separate services for auth, content, search
- Kubernetes deployment

### Option B: Modular Monolith
- Single deployment with clear module boundaries
- Feature flags for gradual migration

## Context
- Current: Next.js monolith with 10,000 mods
- Growth: 2x expected in 6 months
- Team: 2 developers

---

## Persona Evaluations

### Architect (Weight: 1.5)
**Vote:** Approve Option B
**Confidence:** 0.85
**Reasoning:** Modular monolith provides better developer velocity for a small team.
Microservices overhead not justified at current scale.
**Concerns:**
- Ensure module boundaries are enforced
- Plan extraction path for high-traffic services
**Suggestions:**
- Define clear module interfaces now
- Monitor for performance bottlenecks

### Guardian (Weight: 1.5)
**Vote:** Approve Option B
**Confidence:** 0.75
**Reasoning:** Single deployment reduces operational complexity and potential failure points.
**Concerns:**
- Single point of failure
- Need robust error boundaries between modules
**Suggestions:**
- Implement circuit breakers between modules
- Add comprehensive health checks

### Advocate (Weight: 1.0)
**Vote:** Abstain
**Confidence:** 0.5
**Reasoning:** User experience unaffected by backend architecture choice.
**Concerns:** None
**Suggestions:** None

### Pragmatist (Weight: 1.0)
**Vote:** Approve Option B
**Confidence:** 0.9
**Reasoning:** Significantly lower implementation effort and operational cost.
**Concerns:**
- Technical debt if modules become too coupled
**Suggestions:**
- Set up linting rules for module boundaries
- Schedule quarterly architecture reviews

### Curator (Weight: 1.0)
**Vote:** Approve Option B
**Confidence:** 0.8
**Reasoning:** Easier to maintain consistent code quality in a monolith.
**Concerns:**
- Documentation needs to be very clear about module responsibilities
**Suggestions:**
- Create architecture decision records (ADRs)
- Document module interfaces thoroughly

---

## Vote Summary

| Metric | Value |
|--------|-------|
| **Decision** | APPROVED (Option B) |
| **Consensus Level** | Strong |
| **Approve Weight** | 4.45 |
| **Reject Weight** | 0.00 |
| **Abstain Weight** | 0.50 |
| **Confidence** | 83% |

## Key Actions
1. Define clear module interfaces now
2. Implement circuit breakers between modules
3. Set up linting rules for module boundaries
4. Create architecture decision records (ADRs)
5. Schedule quarterly architecture reviews

## Dissenting Opinions
*None - consensus achieved*

---

## Recommendation

**Proceed with Option B (Modular Monolith)** with the following conditions:
1. Document module boundaries before implementation
2. Add circuit breakers for resilience
3. Schedule first architecture review in 3 months
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read context files, code, configs |
| Write | Generate evaluation reports |
| Glob | Find related files for context |
| Grep | Search for patterns and dependencies |

---

## Invocation

### Simple Decision
```bash
claude
> Run persona-swarm to evaluate: Should we add Redis caching?
```

### Compare Options
```bash
claude
> Use persona-swarm to compare: Prisma vs Drizzle for our ORM
```

### Code Review
```bash
claude
> Persona-swarm review of the changes in PR #123
```

### Risk Assessment
```bash
claude
> Persona-swarm risk assessment for deploying the new payment flow
```

---

## Success Criteria

1. All 5 personas provide structured evaluations
2. Vote weights are correctly applied
3. Tie-breaker rules are applied when needed
4. Report includes actionable recommendations
5. Dissenting opinions are captured for transparency
6. Confidence levels reflect evaluation certainty

---

## Limitations

1. **Sequential evaluation**: Personas cannot "discuss" with each other
2. **Static weights**: Vote weights don't adapt based on decision type
3. **No learning**: Personas don't improve from past decisions
4. **Context limits**: Large codebases may exceed context window
5. **Simulated expertise**: Personas are role-played, not specialized models

---

## Configuration

### Customizing Personas

For project-specific needs, personas can be customized:

```typescript
// Example: Add a Performance persona for high-traffic applications
const performancePersona: Persona = {
  id: 'performance',
  name: 'Performance Engineer',
  role: 'Performance & Scalability Expert',
  focusAreas: ['latency', 'throughput', 'caching', 'database-queries'],
  voteWeight: 1.5,
  evaluationPrompt: `Evaluate from a performance perspective:
    - What is the expected latency impact?
    - Are there N+1 query issues?
    - Can this be cached effectively?
    - How does this scale with 10x traffic?`
};
```

### Adjusting Thresholds

```typescript
const votingConfig = {
  approvalThreshold: 0.7,    // 70% weighted votes to approve
  rejectionThreshold: 0.3,   // 30% or less to reject
  guardianVetoConfidence: 0.8, // Guardian can veto at this confidence
};
```

---

## Example Session

```
Persona-Swarm Agent Starting
============================
Decision: Should we migrate from REST to GraphQL?

Loading context...
- Reading: lib/api.ts, app/api/*, prisma/schema.prisma
- Current endpoints: 23
- Data models: 15

Invoking personas...

[1/5] Architect evaluating...
      Vote: APPROVE (confidence: 0.7)
      Key concern: Initial learning curve

[2/5] Guardian evaluating...
      Vote: REJECT (confidence: 0.6)
      Key concern: New attack surface, authorization complexity

[3/5] Advocate evaluating...
      Vote: APPROVE (confidence: 0.8)
      Key concern: None - better client experience

[4/5] Pragmatist evaluating...
      Vote: REJECT (confidence: 0.75)
      Key concern: 2-3 week migration effort

[5/5] Curator evaluating...
      Vote: ABSTAIN (confidence: 0.4)
      Key concern: Insufficient info on testing strategy

Aggregating votes...
- Total weighted votes: 5.65
- Approve weight: 2.35 (41.6%)
- Reject weight: 2.80 (49.6%)
- Abstain weight: 0.50 (8.8%)

Applying tie-breaker rules...
- Vote is split (40-60% range)
- Guardian did not veto (confidence 0.6 < 0.8)
- Architect approves -> tiebreak to APPROVED

Final Decision: APPROVED (weak consensus)

Generating report...
Report saved to: scripts/reports/swarm-graphql-migration-20260125.md

Key Actions:
1. Create security review checklist for GraphQL
2. Plan phased migration (start with read-only queries)
3. Allocate 2 weeks for team GraphQL training
4. Add rate limiting and query complexity limits

Dissenting opinions recorded for transparency.
```

---

## Integration Points

### With Other Agents
- **prd-runner**: Swarm can evaluate PRD stories before implementation
- **facet-curator**: Swarm can decide on taxonomy changes
- **db-script**: Swarm can assess risk of database migrations

### With CI/CD
```yaml
# .github/workflows/swarm-review.yml
name: Swarm Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  swarm-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Persona Swarm Review
        run: |
          claude -p "Run persona-swarm review on this PR diff"
```
