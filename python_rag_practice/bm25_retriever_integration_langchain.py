from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
import nltk
nltk.download("punkt_tab")
from nltk.tokenize import word_tokenize

retriever = BM25Retriever.from_documents(
    [
        Document(page_content="foo"),
        Document(page_content="bar"),
        Document(page_content="world"),
        Document(page_content="hello"),
        Document(page_content="foo bar"),
    ],
    k=5,
    preprocess_func=word_tokenize
)

result = retriever.invoke("foo")
print(f"Retrieved {len(result)} documents:")
for i, doc in enumerate(result):
    print(f"{i+1}. {doc.page_content}")

