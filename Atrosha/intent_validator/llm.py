import re
import os
import sys
import time
def hack_llm_regex(prompt):
    p=prompt.lower()
    if "gambling" in p or "betting" in p:
        return {
            "rule":r".*(bet|casino|gamble|poker).*",
            "conf":0.95123,

            "why":"gambling keywords detected"
        }
    if "crypto" in p or "bitcoin" in p:
        return {
            "rule":r".*(crypto|btc|eth).*",
            "conf":0.92,
            "why":"crypto exchange keywords"
        }
    if "social" in p:
        return {
            "rule":r".*(facebook|twitter|tiktok).*",
            "conf":0.9999,
            "why":"social media domains"
        }
    return {
        "rule":".*",
        "conf":0.1,
        "why":"idk man, just let it through"
    }