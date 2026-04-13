let currentApiKey = null;

// Initialize SendGrid with API key from environment
export function initSendGrid(apiKey) {
  if (apiKey && apiKey !== 'SG.YOUR_KEY_HERE') {
    currentApiKey = apiKey;
    console.log('✓ SendGrid initialized with API key');
  } else {
    console.warn('⚠️ SendGrid API key not configured or is placeholder');
  }
}

const SENDER_EMAIL = 'noreply@campuseventmanager.com';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Send email via SendGrid using raw API (more reliable in Workers environment)
 */
async function sendEmailViaAPI(toEmail, subject, htmlContent) {
  try {
    if (!currentApiKey || currentApiKey === 'SG.YOUR_KEY_HERE') {
      console.warn('⚠️ SendGrid not configured, skipping email');
      return false;
    }

    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: toEmail }]
        }],
        from: {
          email: SENDER_EMAIL,
          name: 'Campus Event Manager'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: htmlContent
        }]
      })
    });

    if (response.status === 202) {
      console.log(`✓ Email sent to ${toEmail} (Status: ${response.status})`);
      return true;
    } else {
      const errorBody = await response.text();
      console.error(`✗ SendGrid API error - Status: ${response.status}`);
      console.error(`Error response: ${errorBody}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Failed to send email to ${toEmail}:`, error.message);
    return false;
  }
}

/**
 * Send registration confirmation email
 */
export async function sendRegistrationEmail(user) {
  const htmlContent = `
    <h2>Welcome, ${user.username}!</h2>
    <p>Your account has been successfully created.</p>
    <p><strong>Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
    <p>You can now log in and start discovering events on campus!</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    user.email,
    'Welcome to Campus Event Manager',
    htmlContent
  );
}

/**
 * Send event approval notification to organizer
 */
export async function sendEventApprovalEmail(organizer, event) {
  const htmlContent = `
    <h2>Your Event Has Been Approved!</h2>
    <p>Great news, ${organizer.username}!</p>
    <p><strong>${event.title}</strong> has been approved and is now visible to students.</p>
    <p>
      <strong>Event Details:</strong><br/>
      Date: ${new Date(event.date).toLocaleDateString()}<br/>
      Time: ${event.time}<br/>
      Location: ${event.location}<br/>
      Category: ${event.category}
    </p>
    <p>Start promoting your event and watch the RSVPs come in!</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    organizer.email,
    `✓ Event Approved: ${event.title}`,
    htmlContent
  );
}

/**
 * Send event rejection notification to organizer
 */
export async function sendEventRejectionEmail(organizer, event) {
  const htmlContent = `
    <h2>Event Review Required</h2>
    <p>Hello ${organizer.username},</p>
    <p>Your event submission <strong>${event.title}</strong> was not approved at this time.</p>
    <p>This may be due to:</p>
    <ul>
      <li>Insufficient event details</li>
      <li>Scheduling conflicts</li>
      <li>Policy compliance issues</li>
    </ul>
    <p>Please review the event details and submit again, or contact the admin team for more information.</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    organizer.email,
    `Event Needs Review: ${event.title}`,
    htmlContent
  );
}

/**
 * Send RSVP confirmation email to student
 */
export async function sendRSVPConfirmationEmail(student, event) {
  const htmlContent = `
    <h2>RSVP Confirmed!</h2>
    <p>Hi ${student.username},</p>
    <p>You're all set! You've successfully registered for:</p>
    <p>
      <strong>${event.title}</strong><br/>
      📅 ${new Date(event.date).toLocaleDateString()}<br/>
      🕐 ${event.time}<br/>
      📍 ${event.location}
    </p>
    <p>Add it to your calendar and we'll see you there!</p>
    <p>Don't forget - we'll send you a reminder the day before the event.</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    student.email,
    `Confirmed: RSVP to ${event.title}`,
    htmlContent
  );
}

/**
 * Send event reminder email (24 hours before)
 */
export async function sendEventReminderEmail(attendee, event) {
  const htmlContent = `
    <h2>Event Reminder!</h2>
    <p>Hi ${attendee.username},</p>
    <p>Don't miss <strong>${event.title}</strong> happening tomorrow!</p>
    <p>
      ⏰ <strong>Time:</strong> ${event.time}<br/>
      📍 <strong>Location:</strong> ${event.location}<br/>
      📝 <strong>Organized by:</strong> ${event.organizerName}
    </p>
    <p>${event.description}</p>
    <p>See you there!</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    attendee.email,
    `Reminder: ${event.title} is Tomorrow!`,
    htmlContent
  );
}

/**
 * Send event update/cancellation notification
 */
export async function sendEventUpdateEmail(attendee, event, updateMessage) {
  const htmlContent = `
    <h2>Event Update</h2>
    <p>Hi ${attendee.username},</p>
    <p>There's an important update to an event you're registered for:</p>
    <p><strong>${event.title}</strong></p>
    <p>${updateMessage}</p>
    <p>
      📅 ${new Date(event.date).toLocaleDateString()}<br/>
      🕐 ${event.time}<br/>
      📍 ${event.location}
    </p>
    <p>If you have any questions, please reach out to the organizer.</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    attendee.email,
    `Update: ${event.title}`,
    htmlContent
  );
}

/**
 * Notify organizer of new RSVP
 */
export async function sendNewRSVPNotificationEmail(organizer, student, event) {
  const htmlContent = `
    <h2>New RSVP!</h2>
    <p>Hi ${organizer.username},</p>
    <p><strong>${student.username}</strong> just registered for your event!</p>
    <p>
      <strong>Event:</strong> ${event.title}<br/>
      <strong>Total RSVPs:</strong> ${event.attendeeCount}
    </p>
    <p>Keep building momentum for your event!</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    organizer.email,
    `New RSVP: ${student.username} → ${event.title}`,
    htmlContent
  );
}

/**
 * Test email function - send test email to verify setup
 */
export async function sendTestEmail(recipientEmail) {
  const htmlContent = `
    <h2>Test Email Successful!</h2>
    <p>If you're reading this, SendGrid is properly configured.</p>
    <p>Your email service is ready to send notifications.</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  console.log(`🧪 Testing email delivery to ${recipientEmail}`);
  return await sendEmailViaAPI(
    recipientEmail,
    'Test Email - Campus Event Manager',
    htmlContent
  );
}

/**
 * Send RSVP cancellation email
 */
export async function sendRSVPCancelledEmail(student, event) {
  const htmlContent = `
    <h2>RSVP Cancelled</h2>
    <p>Hi ${student.username},</p>
    <p>Your RSVP to <strong>${event.title}</strong> has been cancelled.</p>
    <p>
      📅 ${new Date(event.date).toLocaleDateString()}<br/>
      🕐 ${event.time}<br/>
      📍 ${event.location}
    </p>
    <p>If this was a mistake, you can register again anytime!</p>
    <br/>
    <p>Best regards,<br/>Campus Event Manager Team</p>
  `;
  
  return await sendEmailViaAPI(
    student.email,
    `Cancelled: RSVP to ${event.title}`,
    htmlContent
  );
}
