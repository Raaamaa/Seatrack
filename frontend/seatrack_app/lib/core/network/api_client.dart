// lib/core/network/api_client.dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String _baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  // Default: http.Client() asli. Bisa di-override untuk testing.
  static http.Client client = http.Client();

  static Future<Map<String, dynamic>> get(String endpoint, {Map<String, String>? queryParams}) async {
    try {
      Uri uri = Uri.parse('$_baseUrl$endpoint');
      if (queryParams != null) {
        uri = uri.replace(queryParameters: queryParams);
      }
      final response = await client.get(uri, headers: {'Content-Type': 'application/json'});
      return _handleResponse(response);
    } on SocketException {
      throw Exception('Tidak ada koneksi internet. Menggunakan data cache lokal.');
    }
  }

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await client.post(
        Uri.parse('$_baseUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      return _handleResponse(response);
    } on SocketException {
      throw Exception('Tidak dapat terhubung ke server saat ini.');
    }
  }

  static Future<Map<String, dynamic>> patch(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await client.patch(
        Uri.parse('$_baseUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      return _handleResponse(response);
    } on SocketException {
      throw Exception('Tidak dapat terhubung ke server saat ini.');
    }
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode == 401) {
      throw Exception('Sesi autentikasi Google di backend memerlukan perbaikan oleh administrator.');
    }

    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return data;
      }
      throw Exception(data['message'] ?? 'Terjadi kesalahan pada server: status ${response.statusCode}');
    } on FormatException {
      throw Exception('Format respon dari server tidak valid: ${response.statusCode}');
    }
  }
}
