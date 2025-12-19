export type StoredDocument = {
  doc_id: string;
  filename: string;
  pages: string[];
};

export class DocStore {
  private docs = new Map<string, StoredDocument>();

  put(doc: StoredDocument) {
    this.docs.set(doc.doc_id, doc);
  }

  get(doc_id: string): StoredDocument {
    const doc = this.docs.get(doc_id);
    if (!doc) {
      throw new Error("Unknown doc_id");
    }
    return doc;
  }

  has(doc_id: string): boolean {
    return this.docs.has(doc_id);
  }
}
