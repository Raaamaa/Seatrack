// lib/data/models/transaction_model.dart
class TransactionModel {
  final String id;
  final String emailId;
  final String referenceId;
  final DateTime date;
  final String type;
  final int amount;
  final String merchant;
  final String category;
  final String notes;
  final String source;
  final String bank;

  TransactionModel({
    required this.id,
    required this.emailId,
    required this.referenceId,
    required this.date,
    required this.type,
    required this.amount,
    required this.merchant,
    required this.category,
    required this.notes,
    required this.source,
    required this.bank,
  });

  bool get isIncome => type == 'Transfer Masuk' || type == 'Pemasukan';
  bool get isPendingSync => source == 'pending_sync' || id.startsWith('pending-');

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    if (json['date'] != null) {
      parsedDate = DateTime.tryParse(json['date'].toString()) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    int parsedAmount = 0;
    if (json['amount'] is num) {
      parsedAmount = (json['amount'] as num).toInt();
    } else if (json['amount'] is String) {
      parsedAmount = int.tryParse(json['amount'].toString()) ?? 0;
    }

    return TransactionModel(
      id: json['id']?.toString() ?? '',
      emailId: json['emailId']?.toString() ?? '',
      referenceId: json['referenceId']?.toString() ?? '',
      date: parsedDate,
      type: json['type']?.toString() ?? '',
      amount: parsedAmount,
      merchant: json['merchant']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Lainnya',
      notes: json['notes']?.toString() ?? '',
      source: json['source']?.toString() ?? 'auto',
      bank: json['bank']?.toString() ?? 'Unknown',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'emailId': emailId,
    'referenceId': referenceId,
    'date': date.toIso8601String(),
    'type': type,
    'amount': amount,
    'merchant': merchant,
    'category': category,
    'notes': notes,
    'source': source,
    'bank': bank,
  };
}
