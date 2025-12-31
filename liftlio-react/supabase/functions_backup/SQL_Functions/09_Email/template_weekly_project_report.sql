-- =============================================
-- Template: weekly_project_report
-- Descricao: Email semanal para projetos (paleta roxa Liftlio)
-- Criado: 2025-12-30
-- =============================================

-- Inserir ou atualizar template
INSERT INTO email_templates (
  name,
  subject,
  html_content,
  category,
  is_active,
  description
) VALUES (
  'weekly_project_report',
  '{{project_name}} Weekly Report - {{week_range}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Inter, -apple-system, sans-serif; background-color: #f3f4f6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff;">{{project_name}}</h1>
                            <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Weekly Report</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px 10px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase;">Period</p>
                            <p style="margin: 5px 0 0; font-size: 20px; font-weight: 600; color: #111827;">{{week_range}}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px;">
                            <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280; text-transform: uppercase;">Site Analytics</p>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px;">
                                        <p style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff;">{{unique_visitors}}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: rgba(255,255,255,0.9);">VISITORS</p>
                                    </td>
                                    <td width="5"></td>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background: #f3f4f6; border-radius: 12px;">
                                        <p style="margin: 0; font-size: 36px; font-weight: 800; color: #6366f1;">{{total_sessions}}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280;">SESSIONS</p>
                                    </td>
                                    <td width="5"></td>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background: #f3f4f6; border-radius: 12px;">
                                        <p style="margin: 0; font-size: 36px; font-weight: 800; color: #6366f1;">{{total_pageviews}}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280;">PAGEVIEWS</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 40px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 12px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">YouTube Monitoring</p>
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 15px;">
                                            <tr>
                                                <td width="33%" style="text-align: center;">
                                                    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">{{total_videos}}</p>
                                                    <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">VIDEOS</p>
                                                </td>
                                                <td width="33%" style="text-align: center;">
                                                    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">{{total_comments}}</p>
                                                    <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">COMMENTS</p>
                                                </td>
                                                <td width="33%" style="text-align: center;">
                                                    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">{{total_leads}}</p>
                                                    <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">LEADS</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 25px 40px 30px; text-align: center;">
                            <a href="https://liftlio.com/dashboard" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View Dashboard</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 25px 40px; border-top: 1px solid #e5e7eb; text-align: center; background: #f9fafb; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0; font-size: 13px; color: #9ca3af;">Automatic report sent every Sunday</p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Powered by Liftlio</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  'report',
  true,
  'Weekly report for projects - purple Liftlio theme'
)
ON CONFLICT (name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  updated_at = NOW();
