<?php
header('Content-Type: application/json; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/config.php';

function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

// Honeypot — bots fill every field, humans never see this one
if (trim($_POST['website'] ?? '') !== '') {
    echo json_encode(['success' => true]); // pretend success, drop silently
    exit;
}

$required = ['name', 'email', 'message'];
$data = [];

foreach ($required as $field) {
    $value = trim($_POST[$field] ?? '');
    if ($value === '') {
        jsonError('Falta el campo obligatorio: ' . $field);
    }
    $data[$field] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

if (!filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
    jsonError('El email no es válido');
}

$htmlBody = "
<h2>Nuevo mensaje de contacto</h2>
<p><strong>Nombre:</strong> {$data['name']}<br>
<strong>Email:</strong> {$data['email']}</p>
<h3>Mensaje</h3>
<p>" . nl2br($data['message']) . "</p>
";

$payload = [
    'sender'      => ['name' => SENDER_NAME, 'email' => SENDER_EMAIL],
    'to'          => [['email' => NOTIFICATION_TO_EMAIL, 'name' => NOTIFICATION_TO_NAME]],
    'replyTo'     => ['email' => $_POST['email'], 'name' => $data['name']],
    'subject'     => 'Nuevo mensaje de contacto - ' . $data['name'],
    'htmlContent' => $htmlBody,
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'accept: application/json',
        'api-key: ' . BREVO_API_KEY,
        'content-type: application/json',
    ],
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($curlError || $httpCode >= 300) {
    error_log('Brevo API error (contacto): ' . $curlError . ' | HTTP ' . $httpCode . ' | ' . $response);
    jsonError('No se pudo enviar el email. Inténtalo de nuevo más tarde.', 502);
}

echo json_encode(['success' => true]);