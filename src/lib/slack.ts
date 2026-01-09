export async function sendSlackNotification(message: string, type: 'info' | 'error' | 'warning' = 'info') {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.log(`[Slack Notification Mock] [${type.toUpperCase()}] ${message}`);
        return;
    }

    const colors = {
        info: '#36a64f',
        error: '#ff0000',
        warning: '#ffcc00'
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attachments: [
                    {
                        color: colors[type],
                        text: message,
                        footer: "SkillPlus AI Studio",
                        ts: Math.floor(Date.now() / 1000)
                    }
                ]
            })
        });
    } catch (e) {
        console.error("Failed to send Slack notification:", e);
    }
}
