import { getNotionData, getPage, getBlocks } from '../lib/getNotionData'
import { Text, ListItem, Heading, ToDo, Toggle } from '../components/ContentBlocks'
import { TwitterTweetEmbed } from 'react-twitter-embed'
import Header from '../components/Header'
import Heading1 from '../components/Heading1'
import { getAltStr, getCaptionStr, getDateStr } from '../lib/helpers'
import Tags from '../components/Tags'
import NoteLink from '../components/NoteLink'
import Code from '../components/Code'
// import NextPreviousNavigationLinks, { NavLink } from '../components/NextPreviousNavigationLinks'

const databaseId = process.env.NOTION_DATABASE_ID

// TODO
type Post = any

export default function Post({ page, blocks }) {
  if (!page || !blocks) {
    return <div>ページが存在しません</div>
  }

  const title = page.properties.Page.title[0]?.plain_text
  const description = page.properties.Description.rich_text[0]?.plain_text
  const ogImageUrl = page.properties.ogImageUrl.rich_text[0]?.plain_text
  const tags = page.properties.Tag.multi_select.map((_) => _.name)
  const date = page.properties.Date.date.start

  return (
    <>
      <Header titlePre={title} description={description} ogImageUrl={ogImageUrl} />
      <div className="mb-2">
        <div className="mb-4">
          <Heading1>{title}</Heading1>
        </div>
      </div>

      <div>
        <p className={'opacity-90 font-bold'}>
          <span className="posted mr-2">
            <span className="fs12 mr-2">📆</span>
            {getDateStr(date)}
          </span>
          {tags && (
            <span className="tag">
              <span className="fs12 mr-2">🔖 </span>
              <Tags tags={tags} />
            </span>
          )}
        </p>
      </div>
      {/* note マガジンへの導線 */}
      {tags.includes('Notion') && !tags.includes('Fast Notion') && (
        <div className="mb16">
          <NoteLink />
        </div>
      )}

      {blocks.map((block) => {
        const { type, id } = block
        const value = block[type]
        const { text } = value

        switch (type) {
          case 'paragraph':
            return <Text text={value.text} id={id} key={id} />

          case 'heading_1':
            return <Heading text={text} id={id} level={type} key={id} />

          case 'heading_2':
            return <Heading text={text} id={id} level={type} key={id} />

          case 'heading_3':
            return <Heading text={text} id={id} level={type} key={id} />

          case 'bulleted_list_item':
          case 'numbered_list_item':
            return <ListItem key={id} text={value.text} id={id} />

          case 'to_do':
            return <ToDo id={id} key={id} value={value} text={value.text} />

          case 'toggle':
            return <Toggle key={id} text={value.text} children={value.children} />

          case 'image':
            return (
              <figure key={id}>
                <img src={value.file.url} alt={getAltStr(value.caption)} className={'mb-2'} />
                <figcaption>{getCaptionStr(value.caption)}</figcaption>
              </figure>
            )

          case 'embed':
            if (value.url.includes('twitter.com')) {
              const pos = value.url.indexOf('?')
              let tweetId = value.url.substring(0, pos).split('/')[5]
              if (!tweetId) {
                tweetId = value.url.split('/')[5]
              }

              return (
                <TwitterTweetEmbed key={id} tweetId={tweetId} options={{ margin: '0 auto;' }} />
              )
            }

          case 'code':
            return (
              <Code key={id} language={value.language}>
                {value.text[0]?.plain_text}
              </Code>
            )

          default:
            console.log(
              `Unsupported block (${type === 'unsupported' ? 'unsupported by Notion API' : type})`
            )
            return <hr key={id} className="hr border-gray-300 dark:border-gray-400" />
        }
      })}
    </>
  )
}

export const getStaticPaths = async () => {
  // データベースのすべてのデータを取得する
  // Slug のパスを静的に生成するのに必要
  const database = await getNotionData(databaseId)
  return {
    paths: database.map((page) => ({
      params: {
        slug: page.properties.Slug.rich_text[0].plain_text,
      },
    })),
    fallback: false,
  }
}

export const getStaticProps = async (context) => {
  const { slug } = context.params

  const database = await getNotionData(databaseId, {
    or: [
      {
        property: 'Slug',
        text: {
          equals: slug,
        },
      },
    ],
  })

  // ページのメタデータを取得する
  const page = await getPage(database[0].id)
  
  // ページの本文を取得する
  const blocks = await getBlocks(database[0].id)

  const childrenBlocks = await Promise.all(
    blocks
      .filter((block) => block.has_children)
      .map(async (block) => {
        return {
          id: block.id,
          children: await getBlocks(block.id),
        }
      })
  )

  const blocksWithChildren = blocks.map((block) => {
    if (block.has_children) {
      block[block.type].children = childrenBlocks.find((x) => x.id === block.id).children
    }
    return block
  })

  return {
    props: {
      page,
      blocks: blocksWithChildren,
    },
    revalidate: 60,
  }
}
