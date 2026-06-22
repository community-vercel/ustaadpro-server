const requiredTwilioKeys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_PHONE'];
const VEEVOTECH_SMS_URL = 'https://api.veevotech.com/v3/sendsms';
const VEEVOTECH_SENDER = process.env.VEEVOTECH_SENDER_NUM || 'Default';

function hasTwilioConfig() {
  return requiredTwilioKeys.every(key => Boolean(process.env[key]));
}

function hasVeevoTechConfig() {
  return Boolean(process.env.VEEVOTECH_API_KEY);
}

function friendlyVeevoTechError(errorFilter, errorDesc) {
  switch (errorFilter) {
    case 'INVALID_NUMBER':
      return 'Invalid phone number. Please use international format.';
    case 'INSUFFICIENT_BALANCE':
    case 'LOW_BALANCE':
      return 'SMS service temporarily unavailable. Please try again later.';
    case 'INVALID_API_KEY':
      return 'SMS configuration error. Please contact support.';
    case 'UNSUPPORTED_COUNTRY':
      return 'Your country is not supported for SMS delivery.';
    case 'TECHNICAL_ISSUE':
      return 'Technical issue on our end. Please try again shortly.';
    default:
      return errorDesc || 'Failed to send OTP. Please try again.';
  }
}

async function sendVeevoTechSms({to, message}) {
  const response = await fetch(VEEVOTECH_SMS_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      apikey: process.env.VEEVOTECH_API_KEY,
      receivernum: to,
      sendernum: VEEVOTECH_SENDER,
      textmessage: message,
    }),
  });

  if (!response.ok) {
    throw new Error('Network error. Please try again.');
  }

  const data = await response.json();
  const status = data?.STATUS || '';
  const errorFilter = data?.ERROR_FILTER || '';
  const errorDesc = data?.ERROR_DESCRIPTION || '';

  if (status !== 'SUCCESSFUL') {
    throw new Error(friendlyVeevoTechError(errorFilter, errorDesc));
  }

  return data;
}

async function sendTwilioSms({to, message}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_FROM_PHONE,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS failed: ${errorText}`);
  }

  return response.json();
}

export async function sendOtpSms({to, code, purpose = 'verification'}) {
  const message = `Your Ustaad Pro ${purpose} code is ${code}. It expires in 10 minutes. Do not share it with anyone.`;

  if (hasVeevoTechConfig()) {
    return sendVeevoTechSms({to, message});
  }

  if (hasTwilioConfig()) {
    return sendTwilioSms({to, message});
  }

  console.log('SMS is not configured. OTP SMS payload:', {to, message});
  return {devMode: true};
}
