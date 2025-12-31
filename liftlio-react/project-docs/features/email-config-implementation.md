# Implementacao: Configuracao de Email Reports no Admin

## Status: ANALISE COMPLETA - Pronto para implementar

> **TL;DR**: Adicionar nova secao "Email Reports" no Settings do AdminDashboard.
> Precisa criar tabela `email_report_config` e adicionar UI com toggles/forms.

---

## Arquitetura Atual do Settings

```
renderSettings()
├── SettingsSection: Maintenance Mode
│   ├── Toggle: Enable/Disable
│   ├── Message textarea
│   └── Estimated end datetime
├── SettingsSection: Browser Automation Prompts
│   └── PromptCard for each platform (expandable)
└── SettingsSection: Admin Users
    ├── Add admin input
    └── List of admins with remove button
```

---

## Nova Secao Proposta: Email Reports

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMAIL REPORTS                                                              │
│  Configure automated email reports and notifications                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Weekly Owner Report                                    [ACTIVE] ✓  │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Frequency:  ○ Daily  ● Weekly  ○ Monthly                           │   │
│  │  Day:        [Sunday ▼]  at [09:00 ▼] BRT                           │   │
│  │                                                                      │   │
│  │  Recipients:                                                         │   │
│  │  ┌────────────────────────────────────────┐ [+ Add]                 │   │
│  │  │ valdair3d@gmail.com              [×]   │                         │   │
│  │  │ steven@stevenjwilson.com         [×]   │                         │   │
│  │  └────────────────────────────────────────┘                         │   │
│  │                                                                      │   │
│  │  Metrics to Include:                                                 │   │
│  │  ☑ Site Analytics (visitors, sessions, pageviews)                   │   │
│  │  ☑ Waitlist Updates (new signups)                                   │   │
│  │  ☐ Browser Agent Stats (tasks, success rate, cost)                  │   │
│  │  ☐ Email Delivery Stats                                             │   │
│  │                                                                      │   │
│  │  [Test Send]                          [Save Configuration]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [+ Add New Report]                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementacao Detalhada

### 1. Criar Tabela no Supabase

```sql
-- email_report_config
CREATE TABLE email_report_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  report_type VARCHAR(50) NOT NULL, -- 'owner_weekly', 'user_weekly', etc
  frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  day_of_week INTEGER DEFAULT 0, -- 0=Sunday, 6=Saturday (for weekly)
  day_of_month INTEGER, -- 1-28 (for monthly)
  hour_utc INTEGER DEFAULT 12, -- 0-23
  recipients TEXT[] NOT NULL,
  metrics JSONB DEFAULT '{}',
  template_id UUID REFERENCES email_templates(id),
  cron_job_name VARCHAR(100),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current weekly owner report config
INSERT INTO email_report_config (
  name,
  description,
  report_type,
  frequency,
  day_of_week,
  hour_utc,
  recipients,
  metrics,
  cron_job_name
) VALUES (
  'Weekly Owner Report',
  'Weekly summary of Liftlio metrics for owners',
  'owner_weekly',
  'weekly',
  0, -- Sunday
  12, -- 12:00 UTC = 9:00 BRT
  ARRAY['valdair3d@gmail.com', 'steven@stevenjwilson.com'],
  '{"analytics": true, "waitlist": true, "browser_agent": false, "email_stats": false}',
  'weekly_owner_report'
);
```

### 2. Types para TypeScript

```typescript
interface EmailReportConfig {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  hour_utc: number;
  recipients: string[];
  metrics: {
    analytics?: boolean;
    waitlist?: boolean;
    browser_agent?: boolean;
    email_stats?: boolean;
    [key: string]: boolean | undefined;
  };
  template_id: string | null;
  cron_job_name: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### 3. State Variables

```typescript
const [emailReports, setEmailReports] = useState<EmailReportConfig[]>([]);
const [editingReport, setEditingReport] = useState<EmailReportConfig | null>(null);
const [newRecipient, setNewRecipient] = useState('');
const [testingSend, setTestingSend] = useState(false);
```

### 4. Fetch Function

```typescript
const fetchEmailReports = async () => {
  const { data, error } = await supabase
    .from('email_report_config')
    .select('*')
    .order('created_at', { ascending: true });

  if (data && !error) {
    setEmailReports(data);
  }
};
```

### 5. Save Function

```typescript
const saveEmailReport = async (report: EmailReportConfig) => {
  setSavingSettings(true);
  try {
    const { error } = await supabase
      .from('email_report_config')
      .upsert({
        ...report,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await fetchEmailReports();
    alert('Email report configuration saved!');
  } catch (err) {
    console.error('Error saving email report:', err);
    alert('Failed to save configuration');
  } finally {
    setSavingSettings(false);
  }
};
```

### 6. Test Send Function

```typescript
const testSendReport = async (reportId: string) => {
  setTestingSend(true);
  try {
    const { data, error } = await supabase.rpc('send_weekly_owner_report');

    if (error) throw error;

    alert('Test email sent successfully!');
    console.log('Send result:', data);
  } catch (err) {
    console.error('Error sending test:', err);
    alert('Failed to send test email');
  } finally {
    setTestingSend(false);
  }
};
```

### 7. UI Component (SettingsSection)

```tsx
{/* Email Reports Section */}
<SettingsSection>
  <SettingsHeader>
    <div>
      <h3>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Email Reports
      </h3>
      <p>Configure automated email reports and notifications</p>
    </div>
  </SettingsHeader>
  <SettingsBody>
    {emailReports.map(report => (
      <EmailReportCard key={report.id}>
        {/* Toggle enabled */}
        <ToggleRow>
          <div className="info">
            <div className="label">{report.name}</div>
            <div className="description">{report.description}</div>
          </div>
          <Toggle>
            <input
              type="checkbox"
              checked={report.enabled}
              onChange={(e) => updateReportField(report.id, 'enabled', e.target.checked)}
            />
            <span />
          </Toggle>
        </ToggleRow>

        {/* Frequency selector */}
        <FormGroup>
          <label>Frequency</label>
          <RadioGroup>
            <RadioOption>
              <input type="radio" name={`freq-${report.id}`} value="daily"
                checked={report.frequency === 'daily'}
                onChange={() => updateReportField(report.id, 'frequency', 'daily')} />
              <span>Daily</span>
            </RadioOption>
            <RadioOption>
              <input type="radio" name={`freq-${report.id}`} value="weekly"
                checked={report.frequency === 'weekly'}
                onChange={() => updateReportField(report.id, 'frequency', 'weekly')} />
              <span>Weekly</span>
            </RadioOption>
            <RadioOption>
              <input type="radio" name={`freq-${report.id}`} value="monthly"
                checked={report.frequency === 'monthly'}
                onChange={() => updateReportField(report.id, 'frequency', 'monthly')} />
              <span>Monthly</span>
            </RadioOption>
          </RadioGroup>
        </FormGroup>

        {/* Day/Time selector */}
        {report.frequency === 'weekly' && (
          <FormGroup>
            <label>Day & Time</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select value={report.day_of_week || 0}
                onChange={(e) => updateReportField(report.id, 'day_of_week', parseInt(e.target.value))}>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              <select value={report.hour_utc}
                onChange={(e) => updateReportField(report.id, 'hour_utc', parseInt(e.target.value))}>
                {[...Array(24)].map((_, h) => (
                  <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 UTC</option>
                ))}
              </select>
            </div>
          </FormGroup>
        )}

        {/* Recipients */}
        <FormGroup>
          <label>Recipients</label>
          <RecipientList>
            {report.recipients.map((email, idx) => (
              <RecipientTag key={idx}>
                {email}
                <button onClick={() => removeRecipient(report.id, email)}>×</button>
              </RecipientTag>
            ))}
          </RecipientList>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input type="email" placeholder="Add email..."
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)} />
            <Button $variant="ghost" onClick={() => addRecipient(report.id)}>Add</Button>
          </div>
        </FormGroup>

        {/* Metrics */}
        <FormGroup>
          <label>Metrics to Include</label>
          <CheckboxGroup>
            <CheckboxOption>
              <input type="checkbox" checked={report.metrics.analytics}
                onChange={(e) => updateReportMetric(report.id, 'analytics', e.target.checked)} />
              <span>Site Analytics (visitors, sessions, pageviews)</span>
            </CheckboxOption>
            <CheckboxOption>
              <input type="checkbox" checked={report.metrics.waitlist}
                onChange={(e) => updateReportMetric(report.id, 'waitlist', e.target.checked)} />
              <span>Waitlist Updates (new signups)</span>
            </CheckboxOption>
            <CheckboxOption>
              <input type="checkbox" checked={report.metrics.browser_agent}
                onChange={(e) => updateReportMetric(report.id, 'browser_agent', e.target.checked)} />
              <span>Browser Agent Stats (tasks, success rate, cost)</span>
            </CheckboxOption>
            <CheckboxOption>
              <input type="checkbox" checked={report.metrics.email_stats}
                onChange={(e) => updateReportMetric(report.id, 'email_stats', e.target.checked)} />
              <span>Email Delivery Stats</span>
            </CheckboxOption>
          </CheckboxGroup>
        </FormGroup>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <Button $variant="ghost" onClick={() => testSendReport(report.id)} disabled={testingSend}>
            {testingSend ? 'Sending...' : 'Test Send'}
          </Button>
          <Button $variant="primary" onClick={() => saveEmailReport(report)} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Last sent info */}
        {report.last_sent_at && (
          <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginTop: '12px' }}>
            Last sent: {new Date(report.last_sent_at).toLocaleString()}
          </div>
        )}
      </EmailReportCard>
    ))}
  </SettingsBody>
</SettingsSection>
```

---

## Styled Components Necessarios

```typescript
const EmailReportCard = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 24px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};

  input {
    accent-color: #8b5cf6;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxOption = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};

  input {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
  }
`;

const RecipientList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RecipientTag = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.primary};

  button {
    background: none;
    border: none;
    color: ${props => props.theme.colors.text.muted};
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;

    &:hover {
      color: #ef4444;
    }
  }
`;
```

---

## Ordem de Implementacao

1. **Criar tabela `email_report_config`** via Supabase MCP
2. **Inserir config do weekly_owner_report** atual
3. **Adicionar interface `EmailReportConfig`** no AdminDashboard
4. **Adicionar state variables**
5. **Adicionar styled components**
6. **Adicionar fetchEmailReports** e chamar no useEffect
7. **Adicionar funcoes** saveEmailReport, testSendReport, updateReportField, etc
8. **Adicionar SettingsSection** no renderSettings()
9. **Testar** toggle, frequency change, add/remove recipients, save
10. **Atualizar send_weekly_owner_report** para ler da tabela

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| Supabase (via MCP) | Criar tabela email_report_config |
| AdminDashboard.tsx | Interface, state, styled components, render |
| send_weekly_owner_report.sql | (Fase 2) Ler config da tabela |

---

*Analise criada em 2025-12-28*
*Status: Pronto para implementar*
