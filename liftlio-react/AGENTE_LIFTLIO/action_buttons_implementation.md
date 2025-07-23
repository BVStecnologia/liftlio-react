# Action Buttons Implementation for Liftlio Agent

## 1. Quick Action Buttons Structure

### Button Types and Definitions
```typescript
interface ActionButton {
  id: string;
  label: string;
  icon: string;
  action: string;
  type: 'rpc' | 'navigation' | 'form' | 'external';
  tooltip?: string;
  requiresProject?: boolean;
  params?: any;
}

// Main navigation actions (always visible)
const MAIN_ACTIONS: ActionButton[] = [
  {
    id: 'analyze',
    label: 'Analyze',
    icon: '📊',
    action: 'quick_analysis',
    type: 'action',
    tooltip: 'Quick performance analysis',
    requiresProject: true
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: '📺',
    action: 'list_all_channels',
    type: 'rpc',
    tooltip: 'View all monitored channels',
    requiresProject: true
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: '📅',
    action: 'view_schedule',
    type: 'action',
    tooltip: 'View posting schedule',
    requiresProject: true
  }
];

// Alternative set for users without active project
const MAIN_ACTIONS_NO_PROJECT: ActionButton[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    action: '/dashboard',
    type: 'navigation',
    tooltip: 'Go to main dashboard',
    requiresProject: false
  },
  {
    id: 'get_started',
    label: 'Get Started',
    icon: '🚀',
    action: 'show_getting_started',
    type: 'info',
    tooltip: 'Learn how to start with Liftlio',
    requiresProject: false
  },
  {
    id: 'help',
    label: 'Help',
    icon: '💬',
    action: 'show_help_menu',
    type: 'menu',
    tooltip: 'Get help and support',
    requiresProject: false
  }
];

// Context-specific quick actions
const QUICK_ACTIONS: ActionButton[] = [
  {
    id: 'view_all_channels',
    label: 'All Channels',
    icon: '📺',
    action: 'list_all_channels',
    type: 'rpc',
    tooltip: 'View all monitored channels with statistics',
    requiresProject: true
  },
  {
    id: 'performance_analysis',
    label: 'Performance',
    icon: '📊',
    action: 'channel_performance_analysis',
    type: 'rpc',
    tooltip: 'Analyze channel performance metrics',
    requiresProject: true
  },
  {
    id: 'best_posting_times',
    label: 'Best Times',
    icon: '⏰',
    action: 'optimal_posting_schedule',
    type: 'rpc',
    tooltip: 'Find optimal posting schedule',
    requiresProject: true
  },
  {
    id: 'todays_posts',
    label: "Today's Posts",
    icon: '📅',
    action: 'view_todays_posts',
    type: 'navigation',
    tooltip: 'View all posts scheduled for today',
    requiresProject: true
  },
  {
    id: 'project_stats',
    label: 'Statistics',
    icon: '📈',
    action: 'project_stats',
    type: 'rpc',
    tooltip: 'View complete project statistics',
    requiresProject: true
  },
  {
    id: 'create_ticket',
    label: 'Get Help',
    icon: '🎫',
    action: 'create_support_ticket',
    type: 'form',
    tooltip: 'Create a support ticket',
    requiresProject: false
  }
];
```

## 2. Agent Response Format with Actions

### Updated Agent Response Structure
```typescript
interface AgentResponse {
  response: string;
  actions?: ActionButton[];
  metadata?: {
    tools_executed?: string[];
    suggested_actions?: string[];
    context?: any;
  };
}

// Example response with action buttons
{
  response: "I've found 18 active channels in your project. Would you like to explore any specific analysis?",
  actions: [
    {
      id: 'channel_details',
      label: 'Channel Details',
      icon: '📊',
      action: 'channel_performance_analysis',
      type: 'rpc'
    },
    {
      id: 'video_metrics',
      label: 'Video Metrics',
      icon: '🎬',
      action: 'video_engagement_metrics',
      type: 'rpc'
    },
    {
      id: 'schedule_analysis',
      label: 'Best Times',
      icon: '⏰',
      action: 'optimal_posting_schedule',
      type: 'rpc'
    }
  ]
}
```

## 3. Context-Aware Action Suggestions

```typescript
function suggestActions(prompt: string, context: any): ActionButton[] {
  const suggestedActions: ActionButton[] = [];
  const promptLower = prompt.toLowerCase();
  
  // Channel-related queries
  if (promptLower.includes('channel') || promptLower.includes('canal')) {
    suggestedActions.push(
      QUICK_ACTIONS.find(a => a.id === 'view_all_channels'),
      QUICK_ACTIONS.find(a => a.id === 'performance_analysis')
    );
  }
  
  // Time/Schedule queries
  if (promptLower.includes('when') || promptLower.includes('time') || 
      promptLower.includes('schedule') || promptLower.includes('quando')) {
    suggestedActions.push(
      QUICK_ACTIONS.find(a => a.id === 'best_posting_times'),
      QUICK_ACTIONS.find(a => a.id === 'todays_posts')
    );
  }
  
  // Performance/Analytics queries
  if (promptLower.includes('performance') || promptLower.includes('analytics') ||
      promptLower.includes('metrics') || promptLower.includes('statistics')) {
    suggestedActions.push(
      QUICK_ACTIONS.find(a => a.id === 'performance_analysis'),
      QUICK_ACTIONS.find(a => a.id === 'project_stats')
    );
  }
  
  // Always include help option at the end
  if (suggestedActions.length < 3) {
    suggestedActions.push(QUICK_ACTIONS.find(a => a.id === 'create_ticket'));
  }
  
  return suggestedActions.filter(Boolean).slice(0, 4); // Max 4 buttons
}
```

## 4. Main Navigation Buttons Implementation

```typescript
// Special handlers for main navigation buttons
const handleMainAction = async (action: ActionButton) => {
  switch (action.id) {
    case 'analyze':
      // Quick analysis with multiple metrics
      const analysisMessage = `
📊 **Quick Analysis for Today:**

Loading your performance metrics...
      `;
      addMessage('assistant', analysisMessage);
      
      // Execute multiple tools in parallel
      const [stats, performance, schedule] = await Promise.all([
        executeRPC('project_stats'),
        executeRPC('channel_performance_analysis'),
        executeRPC('optimal_posting_schedule')
      ]);
      
      const resultsMessage = formatQuickAnalysis(stats, performance, schedule);
      addMessage('assistant', resultsMessage, [
        { id: 'deep_dive', label: 'Deep Dive', icon: '🔍', action: 'detailed_analysis', type: 'action' },
        { id: 'export', label: 'Export Report', icon: '📄', action: 'export_analysis', type: 'action' }
      ]);
      break;
      
    case 'channels':
      // Direct execution of list_all_channels
      const channelsResponse = await executeRPC('list_all_channels');
      const formattedChannels = formatChannelsList(channelsResponse);
      addMessage('assistant', formattedChannels, [
        { id: 'add_channel', label: 'Add Channel', icon: '➕', action: '/channels/add', type: 'navigation' },
        { id: 'channel_perf', label: 'Performance', icon: '📈', action: 'channel_performance_analysis', type: 'rpc' }
      ]);
      break;
      
    case 'schedule':
      // Show today's schedule and upcoming posts
      const scheduleMessage = `
📅 **Your Posting Schedule:**

Fetching today's posts and upcoming schedule...
      `;
      addMessage('assistant', scheduleMessage);
      
      // Get schedule data
      const scheduleData = await executeRPC('optimal_posting_schedule');
      const todaysPosts = await getTodaysPosts();
      
      const scheduleResults = formatScheduleView(scheduleData, todaysPosts);
      addMessage('assistant', scheduleResults, [
        { id: 'new_post', label: 'Schedule Post', icon: '➕', action: '/posts/new', type: 'navigation' },
        { id: 'best_times', label: 'Best Times', icon: '⏰', action: 'optimal_posting_schedule', type: 'rpc' }
      ]);
      break;
      
    case 'dashboard':
      navigate('/dashboard');
      break;
      
    case 'get_started':
      const gettingStartedMessage = `
🚀 **Welcome to Liftlio!**

Let's get you started in 3 simple steps:

1. **Add Your First Channel** 📺
   Start monitoring YouTube channels in your niche

2. **Set Up Scanner** 🔍
   Configure keywords to find relevant videos

3. **Start Engaging** 💬
   Generate and schedule responses to comments

Ready to begin?
      `;
      addMessage('assistant', gettingStartedMessage, [
        { id: 'add_first_channel', label: 'Add Channel', icon: '📺', action: '/channels/add', type: 'navigation' },
        { id: 'view_tutorial', label: 'Watch Tutorial', icon: '🎥', action: '/tutorial', type: 'navigation' }
      ]);
      break;
      
    case 'how_it_works':
      // Show explanation in the agent
      const howItWorksMessage = `
🚀 **How Liftlio Works:**

1. **Monitor YouTube Channels** 📺
   - Add channels you want to track
   - Our scanner finds relevant videos

2. **Analyze Comments** 💬
   - AI identifies potential leads
   - Lead scoring from 0-100

3. **Generate Responses** ✍️
   - Create personalized replies
   - Schedule posts for optimal times

4. **Track Performance** 📊
   - Monitor engagement rates
   - Optimize your strategy

Would you like to know more about any specific feature?
      `;
      addMessage('assistant', howItWorksMessage, [
        { id: 'add_channel', label: 'Add Channel', icon: '➕', action: '/channels/add', type: 'navigation' },
        { id: 'view_stats', label: 'View Stats', icon: '📊', action: 'project_stats', type: 'rpc' }
      ]);
      break;
      
    case 'help':
      // Show help menu with options
      const helpMessage = `
🆘 **How can I help you?**

Choose an option below or tell me what you need:
      `;
      addMessage('assistant', helpMessage, [
        { id: 'faq', label: 'FAQ', icon: '❓', action: 'show_faq', type: 'info' },
        { id: 'tutorial', label: 'Tutorial', icon: '📚', action: '/tutorial', type: 'navigation' },
        { id: 'contact', label: 'Contact Support', icon: '📧', action: 'create_support_ticket', type: 'form' },
        { id: 'docs', label: 'Documentation', icon: '📖', action: 'https://docs.liftlio.com', type: 'external', params: { url: 'https://docs.liftlio.com' } }
      ]);
      break;
  }
};
```

## 5. Frontend Implementation (FloatingAgent.tsx)

```typescript
// Add to message interface
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
  loading?: boolean;
}

// Action button component
const ActionButtonGroup: React.FC<{ actions: ActionButton[], onAction: (action: ActionButton) => void }> = ({ actions, onAction }) => {
  return (
    <div className="action-buttons-container">
      {actions.map((action) => (
        <button
          key={action.id}
          className="action-button"
          onClick={() => onAction(action)}
          title={action.tooltip}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// Handle action execution
const handleAction = async (action: ActionButton) => {
  // Add user message showing the action
  const actionMessage = `Execute: ${action.label}`;
  addMessage('user', actionMessage);
  
  switch (action.type) {
    case 'rpc':
      // Execute RPC tool through agent
      const response = await fetch('/functions/v1/agente-liftlio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          prompt: `Please execute the ${action.action} tool`,
          context: {
            currentProject: project,
            requestedTool: action.action,
            directExecution: true
          }
        })
      });
      
      const data = await response.json();
      addMessage('assistant', data.response, data.actions);
      break;
      
    case 'navigation':
      // Navigate to specific page
      navigate(`/${action.action}`);
      break;
      
    case 'form':
      // Open form modal
      openModal(action.action);
      break;
      
    case 'external':
      // Open external link
      window.open(action.params?.url, '_blank');
      break;
  }
};
```

## 5. CSS Styling for Action Buttons

```css
.action-buttons-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.action-button:active {
  transform: translateY(0);
}

.action-icon {
  font-size: 16px;
}

.action-label {
  font-size: 13px;
}

/* Dark mode support */
.dark .action-button {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.dark .action-buttons-container {
  border-top-color: rgba(255, 255, 255, 0.1);
}
```

## 6. Agent Modification to Include Actions

```typescript
// In the agent's response generation
const systemPrompt = language === 'pt' 
  ? `...existing prompt...
  
  IMPORTANT: When responding, consider suggesting relevant action buttons based on the user's query.
  Available actions: ${QUICK_ACTIONS.map(a => a.id).join(', ')}
  
  Format your response to be concise since action buttons will provide quick access to detailed information.`
  : `...existing prompt...`;

// After generating response
const suggestedActions = suggestActions(prompt, context);

return new Response(JSON.stringify({
  response: aiResponse,
  actions: suggestedActions,
  metadata: {
    tools_executed: toolResults.map(r => r.tool),
    suggested_actions: suggestedActions.map(a => a.id),
    language,
    history_count: conversationHistory.length
  }
}), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  }
});
```

## 7. Main Navigation Bar (Always Visible at Top)

```typescript
// Main navigation component - always visible
const MainNavigationBar: React.FC = () => {
  return (
    <div className="main-navigation-bar">
      {MAIN_ACTIONS.map(action => (
        <button
          key={action.id}
          className="main-nav-btn"
          onClick={() => handleMainAction(action)}
          title={action.tooltip}
        >
          <span className="nav-icon">{action.icon}</span>
          <span className="nav-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// CSS for main navigation
.main-navigation-bar {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.main-nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.main-nav-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: #667eea;
  color: #667eea;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-weight: 500;
}
```

## 8. Quick Actions Bar (Context-Sensitive)

```typescript
// Component for persistent quick actions
const QuickActionsBar: React.FC = () => {
  const popularActions = [
    QUICK_ACTIONS[0], // All Channels
    QUICK_ACTIONS[1], // Performance
    QUICK_ACTIONS[4], // Statistics
  ];
  
  return (
    <div className="quick-actions-bar">
      <span className="quick-actions-label">Quick Actions:</span>
      {popularActions.map(action => (
        <button
          key={action.id}
          className="quick-action-btn"
          onClick={() => handleAction(action)}
          title={action.tooltip}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
};
```

## Example Use Cases:

1. **User asks about channels:**
   - Response: "You have 18 active channels..."
   - Actions: [View All Channels] [Channel Performance] [Video Metrics]

2. **User asks about posting:**
   - Response: "Here's your posting schedule..."
   - Actions: [Best Times] [Today's Posts] [Schedule New]

3. **User needs help:**
   - Response: "I can help you with that..."
   - Actions: [Create Ticket] [View FAQ] [Contact Support]

4. **General query:**
   - Response: "Here's what I found..."
   - Actions: [Statistics] [All Channels] [Get Help]