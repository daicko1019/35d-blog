import Link from 'next/link'
import Header from '../components/Header'
import Heading1 from '../components/Heading1'
import { ListItem } from '../components/PostItem'
import BlockHeading from '../components/BlockHeading'
import { getNotionData } from '../lib/getNotionData'

const LINK = '/2020-10-27-notion-stock-article'
const ID = 'c08310cd9e3f480d8dfa92a092f7165e'

export async function getStaticProps() {
  const database = await getNotionData(ID)

  return {
    props: {
      books: database,
    },
    revalidate: 60,
  }
}

const StockArticles = (props) => {
  // console.log(props.books.map((_) => _.properties.Date.select))
  interface BookForRender {
    date: string
    books: any
  }

  const tempStockArticlesForRender: BookForRender[] = []
  const booksForRender: BookForRender[] = []

  // [0] まずはすべて代入
  props.books
    .map((_) => _.properties)
    .filter((_) => _.published?.checkbox)
    .forEach((_) => {
      tempStockArticlesForRender.push({ date: _.Date.select?.name, books: [_] })
    })

  // [1] ソートする
  tempStockArticlesForRender.sort((a, b) => {
    if (b.date < a.date) {
      return -1
    }
    if (b.date > a.date) {
      return 1
    }

    return 0
  })

  // [2] 重複削除
  let a = ''
  tempStockArticlesForRender.forEach((_) => {
    if (a !== _.date) {
      booksForRender.push({ date: _.date, books: [_.books[0]] })
      a = _.date
    } else {
      booksForRender.forEach((__, index) => {
        if (__.date === _.date) booksForRender[index].books.push(_.books[0])
      })
    }
  })

  return (
    <div>
      {props.books.length === 0 && <p>There are no posts yet</p>}
      <div>
        <Header titlePre={`読んだ本一覧`} ogImageUrl="https://blog.35d.jp/ogp/2021-01-06-01.jpg" />
        <div className="mb-4">
          <Heading1>読んだ本の一覧</Heading1>
        </div>
        <p>
          読んだ本の一覧をこのページにまとめています。⭐は独断で付けた評価で、また読み返したいなと思った本には最大で5つまで。
        </p>
        <hr className="hr border-gray-300 dark:border-gray-400" />
        <div>
          {booksForRender.map((_, i) => {
            return (
              <section key={_.date + i} className="mb-4">
                <div className="mb-2">
                  <BlockHeading>{_.date}</BlockHeading>
                </div>
                <ul className="list-none">
                  {_.books.map((_, i) => {
                    return (
                      <div key={_.title.title[0]?.plain_text + i}>
                        <ListItem
                          title={_.title.title[0]?.plain_text}
                          url={_.amazonUrl.rich_text[0]?.plain_text}
                          subTitle={_.comment.rich_text[0]?.plain_text}
                          isExtLink={true}
                        />
                      </div>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StockArticles
