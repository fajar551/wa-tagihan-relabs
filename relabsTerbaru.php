<?php
$rawData = file_get_contents('php://input');
$parsedData = json_decode($rawData, true);

$phonenumber = $parsedData['phone'];
$firstname = $parsedData['firstname'];
$message = $parsedData['message'];
$messagename = $parsedData['messagename'];
$norek = $parsedData['norek'];
$vatime = $parsedData['vatime'];
$allitem = $parsedData['allitem'];
$invoiceid = $parsedData['invoiceid'];
$duedate = $parsedData['duedate'];
$totalrupiah = $parsedData['totalrupiah'];
$idclient = $parsedData['idclient'];
$periode = $parsedData['periode'];
$paymentmethod = $parsedData['paymentmethod'];
$isCustomMessage = $parsedData['isCustomMessage'] ?? false;
$reminderWa = $parsedData['reminderWa'] ?? false;

$isdebug = $parsedData['debug'] ?? false;

// Konfigurasi WhatsApp API Server
// Opsi 1: IP Internal yang benar (berdasarkan file lama)
$waApiHost = '10.88.1.94'; // IP laptop server Anda
$waApiPort = '5568'; // Port yang sudah berjalan

// Opsi alternatif jika di atas tidak berfungsi:
// $waApiHost = '103.170.31.131'; // IP publik server WhatsApp API
// $waApiPort = '80'; // Port 80 yang biasanya terbuka
// $waApiHost = 'your-domain.com'; // Ganti dengan domain Anda
// $waApiPort = '80';

$waApiUrl = "http://{$waApiHost}:{$waApiPort}";

if ($message == '') {
    $message = $messagename . ' ' . $norek;
}

if ($isCustomMessage) {
    if (!isset($phonenumber)) {
        die('no phone number');
    }
    // Ini teks custom pada penerima all clients
    $textraw = $message;
} else {
    // Untuk invoice notification, gunakan validasi lengkap
    if (!isset($firstname) && !isset($phonenumber) && !isset($invoiceid)) {
        die('no user, msg or invoiceid');
    }

    if ($reminderWa) {
        // Pesan custom untuk pengingat
        $textraw =
            'Halo ' . $firstname . ',%0a%0a' .
            'Tagihan layanan internet Qwords Anda telah diterbitkan.%0a' .
            'Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda.%0a%0a' .
            'ID Pelanggan: ' . $idclient . '%0a%0a' .
            'Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '.%0a' .
            $message . '%0a%0a' .
            'Jatuh Tempo: ' . $duedate . '%0a' .
            'Periode Tagihan: ' . $periode . '%0a' .
            'Nominal: ' . $totalrupiah . '%0a%0a' .
            'Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini.%0a%0a' .
            'Terima kasih atas kepercayaan Anda menggunakan layanan Qwords!%0a%0a' .
            'Informasi Penting:%0a' .
            '- Tanggal 1-5: Tanpa Denda%0a' .
            '- Tanggal 6-15: Denda 5%%0a' .
            '- Tanggal 16-25: Denda 10%%0a' .
            '- Tanggal 26: Layanan berpotensi suspend.%0a%0a' .
            'Informasi lebih lanjut dapat dilihat melalui akun Anda di portal https://portal.relabs.id/%0a' .
            'Atau silakan hubungi Customer Service kami di 0819-9277-1888%0a%0a' .
            'Salam,%0aQwords Internet';
    } else {
        if (isset($message) && $message !== "") {
            $textraw =
                'Halo ' . $firstname . ',%0a%0a' .
                'Tagihan layanan internet Qwords Anda telah diterbitkan.%0a' .
                'Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda.%0a%0a' .
                'ID Pelanggan: ' . $idclient . '%0a%0a' .
                'Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '.%0a' .
                $message . '%0a%0a' .
                'Jatuh Tempo: ' . $duedate . '%0a' .
                'Periode Tagihan: ' . $periode . '%0a' .
                'Nominal: ' . $totalrupiah . '%0a%0a' .
                'Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini.%0a%0a' .
                'Informasi lebih lanjut dapat dilihat melalui akun Anda di portal https://portal.relabs.id/%0a' .
                'Atau silakan hubungi Customer Service kami di 0819-9277-1888%0a%0a' .
                'Salam,%0aQwords Internet';
        } else {
            $textraw =
                'Halo ' . $firstname . ',%0a%0a' .
                'Tagihan layanan internet Qwords Anda telah diterbitkan.%0a' .
                'Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda.%0a%0a' .
                'ID Pelanggan: ' . $idclient . '%0a%0a' .
                'Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '.%0a%0a' .
                'Jatuh Tempo: ' . $duedate . '%0a' .
                'Periode Tagihan: ' . $periode . '%0a' .
                'Nominal: ' . $totalrupiah . '%0a%0a' .
                'Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini.%0a%0a' .
                'Informasi lebih lanjut dapat dilihat melalui akun Anda di portal https://portal.relabs.id/%0a' .
                'Atau silakan hubungi Customer Service kami di 0819-9277-1888%0a%0a' .
                'Salam,%0aQwords Internet';
        }
    }
}

$text = urlencode($textraw);

// Debug mode - tampilkan pesan tanpa kirim
if ($isdebug) {
    echo "=== DEBUG MODE ===\n";
    echo "Phone: " . $phonenumber . "\n";
    echo "Message:\n" . $textraw . "\n";
    echo "Encoded: " . $text . "\n";
    echo "API URL: " . $waApiUrl . "/send?phone=" . $phonenumber . "&text=" . $text . "\n";
    die;
}

// Kirim pesan ke WhatsApp API
$curl = curl_init();

$apiUrl = $waApiUrl . "/send?phone=" . $phonenumber . "&text=" . $text;

curl_setopt_array($curl, array(
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => "GET",
    CURLOPT_HTTPHEADER => array(
        "Accept: application/json",
        "Content-Type: application/json",
        "User-Agent: Qwords-Relabs-API/1.0"
    ),
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$err = curl_error($curl);
curl_close($curl);

// Parse response
$responseData = json_decode($response, true);

// Log untuk debugging
$logData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'phone' => $phonenumber,
    'invoice_id' => $invoiceid ?? 'N/A',
    'api_url' => $apiUrl,
    'http_code' => $httpCode,
    'curl_error' => $err,
    'response' => $response,
    'response_parsed' => $responseData
];

// Simpan log (opsional)
file_put_contents('wa_api_log.txt', json_encode($logData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// Handle response
if ($err) {
    echo json_encode([
        'status' => 'error',
        'message' => 'CURL Error: ' . $err,
        'data' => $logData
    ]);
} elseif ($httpCode !== 200) {
    echo json_encode([
        'status' => 'error',
        'message' => 'HTTP Error: ' . $httpCode,
        'data' => $logData
    ]);
} else {
    // Success response
    if (isset($responseData['code']) && $responseData['code'] === 200) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Pesan berhasil dikirim',
            'data' => $responseData
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'WhatsApp API Error: ' . ($responseData['data'] ?? 'Unknown error'),
            'data' => $logData
        ]);
    }
}