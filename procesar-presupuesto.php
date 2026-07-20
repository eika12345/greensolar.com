<?php
header('Content-Type: application/json; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/config.php';

function jsonError($message, $code = 400, $errorCode = 'generic') {
    http_response_code($code);
    // 'error' stays as a Spanish fallback (useful in logs/curl testing);
    // 'errorCode' is what the frontend maps to a translated string via i18n.
    echo json_encode(['success' => false, 'error' => $message, 'errorCode' => $errorCode]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405, 'method_not_allowed');
}

// ── 1. Collect + validate fields (never trust client-side validation alone) ──
$required = ['tipoInstalacion', 'tipoServicio', 'ubicacion', 'direccion', 'nombre', 'telefono', 'email'];
$data = [];

foreach ($required as $field) {
    $value = trim($_POST[$field] ?? '');
    if ($value === '') {
        jsonError('Falta el campo obligatorio: ' . $field, 400, 'missing_field');
    }
    $data[$field] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

if (!filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
    jsonError('El email no es válido', 400, 'invalid_email');
}

// tipoTejado + consumo/superficie only exist in the form when tipoServicio === 'fotovoltaica'
$esFotovoltaica = $data['tipoServicio'] === 'fotovoltaica';

$data['tipoTejado'] = '';
if ($esFotovoltaica) {
    $tipoTejado = trim($_POST['tipoTejado'] ?? '');
    if ($tipoTejado === '') {
        jsonError('Falta el campo obligatorio: tipoTejado', 400, 'missing_field');
    }
    $data['tipoTejado'] = htmlspecialchars($tipoTejado, ENT_QUOTES, 'UTF-8');
}

// comentarios is always optional, free text
$comentarios = trim($_POST['comentarios'] ?? '');
$data['comentarios'] = htmlspecialchars($comentarios, ENT_QUOTES, 'UTF-8');

$consumoMensual = (float) ($_POST['consumoMensual'] ?? 0);
$tejadoAncho    = (float) ($_POST['tejadoAncho'] ?? 0);
$tejadoAlto     = (float) ($_POST['tejadoAlto'] ?? 0);

// ── 2. Recalculate the estimate server-side (never trust numbers computed in the browser) ──
// Panel/kW/savings math only makes sense for a solar installation; other
// services (EV charger, piscina, baterías) skip straight to a plain contact request.
$consumoAnualKwh     = 0;
$potenciaNecesariaKw = 0;
$numPaneles          = 0;
$superficieTejado    = 0;
$superficieNecesaria = 0;
$ahorroAnualEstimado = 0;
$cabeEnTejado        = null;

if ($esFotovoltaica) {
    $consumoAnualKwh    = $consumoMensual * 12;
    $horasSolPico       = 4.5;
    $eficienciaSistema  = 0.8;
    $potenciaWattPanel  = 450;

    $potenciaNecesariaKw = $consumoAnualKwh / ($horasSolPico * 365 * $eficienciaSistema);
    $numPaneles          = max(1, (int) ceil(($potenciaNecesariaKw * 1000) / $potenciaWattPanel));
    $superficieTejado    = $tejadoAncho * $tejadoAlto;
    $superficieNecesaria = $numPaneles * 1.7;
    $ahorroAnualEstimado = round($consumoAnualKwh * 0.15 * 0.7);
    $cabeEnTejado        = $superficieTejado >= $superficieNecesaria;
}

// ── 3. Handle the optional factura upload ──
$attachments = [];
if (isset($_FILES['factura']) && $_FILES['factura']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['factura'];

    $allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    $maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!in_array($file['type'], $allowedTypes, true)) {
        jsonError('El archivo de la factura debe ser PDF, JPG o PNG', 400, 'invalid_file_type');
    }
    if ($file['size'] > $maxSizeBytes) {
        jsonError('El archivo de la factura no puede superar 5MB', 400, 'file_too_large');
    }

    $attachments[] = [
        'content' => base64_encode(file_get_contents($file['tmp_name'])),
        'name'    => basename($file['name']),
    ];
}

// ── 4. Build the email body ──
$labels = [
    'vivienda-unifamiliar' => 'Vivienda Unifamiliar',
    'comunidad-vecinos'    => 'Comunidad de Vecinos',
    'empresa'              => 'Empresa',
    'fotovoltaica'         => 'Instalación Fotovoltaica',
    'cargador-ev'          => 'Cargador Vehículo Eléctrico',
    'piscina'              => 'Piscina',
    'baterias'             => 'Baterías de Almacenamiento',
    'plano'                => 'Plano',
    'un-agua'               => 'A un agua',
    'dos-aguas'             => 'A dos aguas',
    'otro'                 => 'Otro',
    'murcia'               => 'Murcia',
    'alicante-valencia'    => 'Alicante / Valencia',
];

$tipoInstalacionLabel = $labels[$data['tipoInstalacion']] ?? $data['tipoInstalacion'];
$tipoServicioLabel    = $labels[$data['tipoServicio']] ?? $data['tipoServicio'];
$tipoTejadoLabel      = $labels[$data['tipoTejado']] ?? $data['tipoTejado'];
$ubicacionLabel       = $labels[$data['ubicacion']] ?? $data['ubicacion'];

$consumoTejadoSection = '';
$estimacionSection    = '';

if ($esFotovoltaica) {
    $consumoTejadoSection = "
<h3>Consumo y tejado</h3>
<p><strong>Tipo de tejado:</strong> {$tipoTejadoLabel}<br>
<strong>Consumo mensual:</strong> {$consumoMensual} kW ({$consumoAnualKwh} kWh/año)<br>
<strong>Superficie del tejado:</strong> {$tejadoAncho}m x {$tejadoAlto}m = {$superficieTejado} m²</p>";

    $estimacionSection = "
<h3>Estimación calculada</h3>
<p><strong>Paneles estimados:</strong> {$numPaneles}<br>
<strong>Potencia estimada:</strong> " . number_format($potenciaNecesariaKw, 2) . " kW<br>
<strong>Superficie necesaria:</strong> {$superficieNecesaria} m²<br>
<strong>Ahorro anual estimado:</strong> {$ahorroAnualEstimado} €</p>";
}

$comentariosSection = $data['comentarios'] !== ''
    ? "<h3>Información adicional</h3><p>{$data['comentarios']}</p>"
    : '';

$htmlBody = "
<h2>Nueva solicitud de presupuesto</h2>
<h3>Datos del cliente</h3>
<p><strong>Nombre:</strong> {$data['nombre']}<br>
<strong>Teléfono:</strong> {$data['telefono']}<br>
<strong>Email:</strong> {$data['email']}</p>

<h3>Detalles de la instalación</h3>
<p><strong>Tipo de instalación:</strong> {$tipoInstalacionLabel}<br>
<strong>Servicio de interés:</strong> {$tipoServicioLabel}<br>
<strong>Ubicación:</strong> {$ubicacionLabel}<br>
<strong>Dirección:</strong> {$data['direccion']}</p>
{$consumoTejadoSection}
{$estimacionSection}
{$comentariosSection}
" . (empty($attachments) ? '<p><em>No se adjuntó factura.</em></p>' : '<p>Factura adjunta.</p>');

// ── 5. Send via Brevo's transactional email API ──
$payload = [
    'sender'      => ['name' => SENDER_NAME, 'email' => SENDER_EMAIL],
    'to'          => [['email' => NOTIFICATION_TO_EMAIL, 'name' => NOTIFICATION_TO_NAME]],
    'replyTo'     => ['email' => $_POST['email'], 'name' => $data['nombre']],
    'subject'     => 'Nueva solicitud de presupuesto - ' . $data['nombre'],
    'htmlContent' => $htmlBody,
];

if (!empty($attachments)) {
    $payload['attachment'] = $attachments;
}

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

$response   = curl_exec($ch);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);

if ($curlError || $httpCode >= 300) {
    error_log('Brevo API error: ' . $curlError . ' | HTTP ' . $httpCode . ' | ' . $response);
    jsonError('No se pudo enviar el email. Inténtalo de nuevo más tarde.', 502, 'send_failed');
}

// ── 6. Respond with the estimate so the frontend confirmation screen can show it ──
echo json_encode([
    'success' => true,
    'estimate' => [
        'esFotovoltaica'      => $esFotovoltaica,
        'numPaneles'          => $numPaneles,
        'potenciaKw'          => number_format($potenciaNecesariaKw, 2),
        'superficieNecesaria' => $superficieNecesaria,
        'cabeEnTejado'        => $cabeEnTejado,
        'ahorroAnualEstimado' => $ahorroAnualEstimado,
    ],
]);