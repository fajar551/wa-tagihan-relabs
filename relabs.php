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
    
    $isdebug = $parsedData['debug'];
    
    // Untuk pesan custom, hanya perlu cek nomor telepon
    // if ($isCustomMessage) {
    //     if (!isset($phonenumber)) {
    //         die('no phone number');    
    //     }
    //     // Ini teks custom pada penerima all clients
    //     $textraw = $message;
    // } else {
    //     // Untuk invoice notification, gunakan validasi lengkap
    //     if (!isset($firstname) && !isset($phonenumber) && !isset($invoiceid)){
    //         die('no user, msg or invoiceid');    
    //     }
        
    //     if (isset($message) && $message !== "") {
    //         $textraw = 'Halo ' . $firstname . ', %0a%0a
    //         Tagihan layanan internet Qwords Anda telah diterbitkan.. %0a Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda. %0a%0a ID Pelanggan: ' . $idclient . '%0a%0a Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '.  ' . $message . ' %0a%0a Jatuh Tempo: Tanggal ' . $duedate. '%0a Periode Tagihan: ' .  $periode . ' %0a Nominal: ' . $totalrupiah . ' %0a%0a Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini. %0a%0a Informasi lebih lanjut dapat dilihat melalui akun anda di portal https://portal.relabs.id/ atau silahkan hubungi Customer service kami di 0819-9277-1888 %0a%0a Salam, %0a Qwords Internet';
    //     } else {
    //         $textraw = 'Halo ' . $firstname . ', %0a%0a
    //         Tagihan layanan internet Qwords Anda telah diterbitkan.. %0a Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda. %0a%0a ID Pelanggan: ' . $idclient . '%0a%0a Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '. ' . $messagename . ' %0a%0a Jatuh Tempo: Tanggal ' . $duedate. '%0a Periode Tagihan: ' .  $periode . ' %0a Nominal: ' . $totalrupiah . ' %0a%0a Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini. %0a%0a Informasi lebih lanjut dapat dilihat melalui akun anda di portal https://portal.relabs.id/ atau silahkan hubungi Customer service kami di 0819-9277-1888 %0a%0a Salam, %0a Qwords Internet';
    //     }
    // }
    
    
    if ($message == '')
    {
        $message = $messagename.' '.$norek;
    }
    
    if ($isCustomMessage) {
        if (!isset($phonenumber)) {
            die('no phone number');    
        }
        // Ini teks custom pada penerima all clients
        $textraw = $message;
    } else {
        // Untuk invoice notification, gunakan validasi lengkap
        if (!isset($firstname) && !isset($phonenumber) && !isset($invoiceid)){
            die('no user, msg or invoiceid');    
        }
        
        if ($reminderWa) {
            // Pesan custom untuk pengingat
            // $textraw = 'Halo ' . $firstname . ', %0a%0a
            //     Tagihan layanan internet Qwords Anda telah diterbitkan.. %0a Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda. %0a%0a ID Pelanggan: ' . $idclient . '%0a%0a Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '. ' . $message . ' %0a%0a Jatuh Tempo: Tanggal ' . $duedate. '%0a Periode Tagihan: ' .  $periode . ' %0a Nominal: ' . $totalrupiah . ' %0a%0a Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini.   %0a%0a Terima kasih atas kepercayaan Anda menggunakan layanan Qwords! %0a%0a Informasi Penting: %0a%0a - Tanggal 1-5: Tanpa Denda %0a - Tanggal 6-15: Denda 5%  %0a - Tanggal 16-25: Denda 10% %0a - Tanggal 26: Layanan berpotensi suspend. %0a%0a Informasi lebih lanjut dapat dilihat melalui akun anda di portal https://portal.relabs.id/ atau silahkan hubungi Customer service kami di 0819-9277-1888 %0a%0a Salam, %0a Qwords Internet';
            
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
                // $textraw = 'Halo ' . $firstname . ', %0a%0a
                // Tagihan layanan internet Qwords Anda telah diterbitkan.. %0a Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda. %0a%0a ID Pelanggan: ' . $idclient . '%0a%0a Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '.  ' . $message . ' %0a%0a Jatuh Tempo: Tanggal ' . $duedate. '%0a Periode Tagihan: ' .  $periode . ' %0a Nominal: ' . $totalrupiah . ' %0a%0a Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini. %0a%0a Informasi lebih lanjut dapat dilihat melalui akun anda di portal https://portal.relabs.id/ atau silahkan hubungi Customer service kami di 0819-9277-1888 %0a%0a Salam, %0a Qwords Internet';
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
                // $textraw = 'Halo ' . $firstname . ', %0a%0a
                // Tagihan layanan internet Qwords Anda telah diterbitkan.. %0a Silakan cek email Anda atau hubungi kami jika ada kendala. Pembayaran tepat waktu akan membantu kelancaran layanan Anda. %0a%0a ID Pelanggan: ' . $idclient . '%0a%0a Segera lakukan transaksi sebelum layanan jatuh tempo menggunakan metode pembayaran ' . $paymentmethod . '. ' . $message . ' %0a%0a Jatuh Tempo: Tanggal ' . $duedate. '%0a Periode Tagihan: ' .  $periode . ' %0a Nominal: ' . $totalrupiah . ' %0a%0a Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan. Jika Anda sudah melakukan pembayaran, abaikan pesan ini. %0a%0a Informasi lebih lanjut dapat dilihat melalui akun anda di portal https://portal.relabs.id/ atau silahkan hubungi Customer service kami di 0819-9277-1888 %0a%0a Salam, %0a Qwords Internet';
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
    
    if (isset($isdebug)){
        echo $textraw;
        die;
    }
    
    $curl = curl_init();
                     
    curl_setopt_array($curl, array(
        CURLOPT_PORT => "5568",
        CURLOPT_URL => "http://10.88.1.94:5568/send?phone=".$phonenumber."&text=".$text,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_INTERFACE, "10.88.1.93",
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
        CURLOPT_HTTPHEADER => array(
            "Accept: */*",
            "Accept-Encoding: gzip, deflate",
            "Cache-Control: no-cache",
            "Connection: keep-alive",
            "Host: 103.195.91.178:3000",
            "Postman-Token: 1952fb45-77f8-44f8-b9d3-0fd40948aa30,ccbcb75b-4d13-49bd-9c3a-f31e10d4ae36",
            "User-Agent: PostmanRuntime/7.19.0",
            "cache-control: no-cache"
        ),
    ));
                    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    echo 'err' . $err;
    echo $response;
    curl_close($curl);