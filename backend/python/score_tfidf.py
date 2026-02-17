import json, sys
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

payload = json.loads(sys.stdin.read())
job = (payload.get("jobText") or "").lower()
resume = (payload.get("resumeText") or "").lower()

vectorizer = TfidfVectorizer(stop_words="english")
tfidf = vectorizer.fit_transform([job, resume])

score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])

terms = np.array(vectorizer.get_feature_names_out())
resume_vec = tfidf[1].toarray().flatten()

top_terms = []
if resume_vec.sum() > 0:
    top_idx = resume_vec.argsort()[-10:][::-1]
    top_terms = terms[top_idx].tolist()

print(json.dumps({
    "score": score,
    "scorePercent": round(score * 100, 2),
    "topTerms": top_terms
}))
