use crate::reactive::utils::{get_number_by_selector, get_text_by_selector, text_to_num};
use anyhow::anyhow;
use block_mesh_common::interfaces::server_api::FeedElement;
use regex::Regex;
use scraper::{Html, Selector};
use std::collections::HashMap;

pub fn feed_element_try_from(html: &str, origin: &str) -> anyhow::Result<FeedElement> {
    let fragment = Html::parse_fragment(html);
    let mut map: HashMap<String, String> = HashMap::new();
    map.insert(
        "tweet".to_owned(),
        get_text_by_selector(&fragment, "[data-testid='tweetText']")?,
    );
    
    map.insert(
        "reply".to_owned(),
        get_number_by_selector(&fragment, "[data-testid='reply']")?,
    );
    
    map.insert(
        "retweet".to_owned(),
        get_number_by_selector(&fragment, "[data-testid='retweet']")?,
    );
    
    map.insert(
        "like".to_owned(),
        get_number_by_selector(&fragment, "[data-testid='like']")?,
    );
    
    let href = Selector::parse("[href]").map_err(|e| anyhow!(e.to_string()))?;
    let re = Regex::new(r"/(?P<username>[^/]+)/status/(?P<id>\d+$)")
        .map_err(|e| anyhow!(e.to_string()))?;
    map.insert("raw".to_owned(), html.to_string());
    for element in fragment.select(&href) {
        if let Some(href_value) = element.value().attr("href") {
            if let Some(caps) = re.captures(href_value) {
                if let Some(username) = caps.name("username") {
                    map.insert("user_name".to_owned(), username.as_str().to_owned());
                }
                if let Some(id) = caps.name("id") {
                    map.insert("id".to_owned(), id.as_str().to_owned());
                }
                map.insert("link".to_owned(), href_value.to_owned());
                map.insert("origin".to_owned(), origin.to_owned());
            }
        }
    }

    let result = FeedElement {
        origin: map
            .get("origin")
            .ok_or(anyhow!("missing origin"))?
            .to_string(),
        link: format!(
            "https://x.com{}",
            map.get("link").ok_or(anyhow!("missing link"))?
        ),
        user_name: map
            .get("user_name")
            .ok_or(anyhow!("missing user_name"))?
            .to_string(),
        tweet: Some(map.get("tweet").unwrap_or(&"".to_string()).to_string()),
        id: map.get("id").ok_or(anyhow!("missing id"))?.to_string(),
        raw: map.get("raw").ok_or(anyhow!("missing raw"))?.to_string(),
        reply: text_to_num(
            map.get("reply")
                .ok_or(anyhow!("missing reply"))?
                .to_string(),
        ),
        retweet: text_to_num(
            map.get("retweet")
                .ok_or(anyhow!("missing retweet"))?
                .to_string(),
        ),
        like: text_to_num(map.get("like").ok_or(anyhow!("missing like"))?.to_string()),
    };
    
    Ok(result)
}
