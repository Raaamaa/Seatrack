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

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'] ?? '',
      emailId: json['emailId'] ?? '',
      referenceId: json['referenceId'] ?? '',
      date: DateTime.parse(json['date']),
      type: json['type'] ?? '',
      amount: json['amount'] ?? 0,
      merchant: json['merchant'] ?? '',
      category: json['category'] ?? 'Lainnya',
      notes: json['notes'] ?? '',
      source: json['source'] ?? 'auto',
      bank: json['bank'] ?? 'Unknown',
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
